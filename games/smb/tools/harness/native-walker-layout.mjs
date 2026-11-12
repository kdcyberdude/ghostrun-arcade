/** Decode static native enemy-group records from a disassembly's world/area
 * tables. node tools/harness/native-walker-layout.mjs --source FILE
 * [--out data/native-walker-groups.json] [--apply]
 * Level coordinates/counts come from raw object bytes, never fitted routes.
 * --apply enriches current compiled levels; compile-levels imports the same
 * helper for reproducibility. .byte/.db input dialects are both supported. */
import fs from 'node:fs';
import {parseArgs} from 'node:util';
import {applyNativeWalkerGroups} from '../native-walker-groups.mjs';
const {values:a}=parseArgs({options:{source:{type:'string'},out:{type:'string',default:'data/native-walker-groups.json'},apply:{type:'boolean',default:false}}});
if(!a.source)throw Error('--source is required');
const source=fs.readFileSync(a.source,'utf8'),levels=JSON.parse(fs.readFileSync('data/levels.json','utf8'));
const labels=[...source.slice(source.indexOf('EnemyDataAddrLow:'),source.indexOf('EnemyDataAddrHigh:')).matchAll(/<([A-Za-z0-9_]+)/g)].map(m=>m[1]);
function bytesAt(label){
 const start=source.indexOf(label+':');if(start<0)throw Error(`Missing ${label}`);
 const bytes=[];
 for(const line of source.slice(start+label.length+1).split('\n')){
  const data=line.split(';')[0].match(/\.(?:byte|db)\s+(.+)/);if(!data)continue;
  for(const part of data[1].split(',')){
   if(!/^\s*\$[0-9a-f]+\s*$/i.test(part))throw Error(`Non-byte operand ${part}`);
   const b=parseInt(part.trim().slice(1),16);bytes.push(b);if(b===255)return bytes;
  }
 }
 throw Error(`Unterminated ${label}`);
}
function groupsAt(pointer){
 const label=labels[[31,6,28,0][pointer>>5&3]+(pointer&31)],bytes=bytesAt(label),groups=[],singles=[];let page=0,pageSelected=false;
 for(let i=0;i<bytes.length&&bytes[i]!==255;){
  const a=bytes[i],b=bytes[i+1],row=a&15;
  if(b&128&&!pageSelected){page++;pageSelected=true;}
  if(row===15&&!pageSelected){page=b&63;pageSelected=true;i+=2;continue;}
  if(row===14){i+=3;pageSelected=false;continue;}
  const id=b&63;
  if([0,1,2,3,4,6,14,15,16].includes(id)){const kind={0:'koopa',1:'redKoopa',2:'beetle',3:'redKoopa',4:'koopa',6:'goomba',14:'paratroopa',15:'paratroopa',16:'paratroopa'}[id];singles.push({id,offset:i,kind,x:page*256+(a&240),y:row*16+32});}
  if(id>=55&&id<=62){const code=id-55;groups.push({offset:i,column:page*256+(a&240),kind:code<4?'goomba':'koopa',count:2+(code&1),y:(code&2?112:176)+32});}
  i+=2;pageSelected=false;
 }
 return {pointer,label,singles,groups};
}
const layouts=[];
for(const level of levels){
 const [world,stage]=level.id.split('-').map(Number),row=source.match(new RegExp(`World${world}Areas:.*`))?.[0];
 if(!row)throw Error(`Missing native world ${world}`);
 const pointers=[...row.matchAll(/\$([0-9a-f]{2})/gi)].map(m=>parseInt(m[1],16)),index=stage-1+(pointers.length===5&&stage>2?1:0),main=level.areas.find(a=>a.id===level.main),bindings=[[main.id,pointers[index]]];
 // Five-entry world tables include a pipe intro followed by its destination.
 if(pointers.length===5&&stage===2&&main.autoWalk)bindings.push([main.pipes[0].to,pointers[index+1]]);
 for(const [area,pointer] of bindings){const data=groupsAt(pointer);layouts.push({level:level.id,area,...data});}
}
fs.writeFileSync(a.out,JSON.stringify(layouts,null,1)+'\n');
if(a.apply){applyNativeWalkerGroups(levels,layouts);const tmp=`data/.levels-${process.pid}.json`;fs.writeFileSync(tmp,JSON.stringify(levels,null,2)+'\n');fs.renameSync(tmp,'data/levels.json');}
console.log(`${layouts.length} native areas, ${layouts.reduce((n,a)=>n+a.groups.length,0)} native group records`);

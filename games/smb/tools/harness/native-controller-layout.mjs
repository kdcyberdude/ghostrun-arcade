/** Native enemy-data controllers: id23 may remain flagged in NoRunCode when
 * InitEnemyFrenzy is inhibited; id52 is the persistent WarpZoneObject.
 * node tools/harness/native-controller-layout.mjs --source DISASSEMBLY */
import fs from 'node:fs';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{source:{type:'string'},out:{type:'string',default:'data/native-frenzy-controllers.json'}}});
if(!a.source)throw Error('--source is required');
const source=fs.readFileSync(a.source,'utf8'),layouts=JSON.parse(fs.readFileSync('data/native-walker-groups.json','utf8')),out=[];
for(const layout of layouts){
 const start=source.indexOf(layout.label+':');if(start<0)throw Error(`Missing ${layout.label}`);
 const bytes=[];let end=false;
 for(const line of source.slice(start+layout.label.length+1).split('\n')){
  const data=line.split(';')[0].match(/\.(?:byte|db)\s+(.+)/);if(!data)continue;
  for(const operand of data[1].split(',')){const b=parseInt(operand.trim().slice(1),16);bytes.push(b);if(b===255){end=true;break;}}
  if(end)break;
 }
 const records=[];let page=0,pageSelected=false;
 for(let offset=0;offset<bytes.length&&bytes[offset]!==255;){
  const first=bytes[offset],second=bytes[offset+1],row=first&15;
  if(second&128&&!pageSelected){page++;pageSelected=true;}
  if(row===15&&!pageSelected){page=second&63;pageSelected=true;offset+=2;continue;}
  if(row===14){offset+=3;pageSelected=false;continue;}
  if([23,52].includes(second&63))records.push({id:second&63,offset,column:page*256+(first&240),y:row*16,hardOnly:Boolean(second&64)});
  offset+=2;pageSelected=false;
 }
 if(records.length)out.push({level:layout.level,area:layout.area,label:layout.label,pointer:layout.pointer,records});
}
fs.writeFileSync(a.out,JSON.stringify(out,null,1)+'\n');console.log(`${out.reduce((n,a)=>n+a.records.length,0)} native enemy controller records`);

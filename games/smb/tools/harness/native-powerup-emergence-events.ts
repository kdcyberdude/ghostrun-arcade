/** Source GrowThePowerUp checks across native v2 and mood captures.
 * npx tsx tools/harness/native-powerup-emergence-events.ts --traces DIR --corpus DIR --out JSON */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {nativePowerupEmergence} from '../../src/native-powerup.js';
const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'},'replay-entry':{type:'string'},'replay-level':{type:'string'},'replay-frames':{type:'string'}}});
if(!a.out||!a.traces&&!a.corpus)throw Error('--out and input required');
const sources:{kind:string;id:string;directory:string}[]=[];
if(a.traces)for(const id of fs.readdirSync(a.traces).sort())if(fs.existsSync(path.join(a.traces,id,'ram.bin')))sources.push({kind:'v2',id,directory:path.join(a.traces,id)});
if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')).sort())sources.push({kind:'mood',id,directory:path.join(a.corpus,'captures',id)});
const receipts=[],transitions=new Map<string,any>(),diagnostics=[];let frames=0,rows=0,frozenRows=0;const engines:Record<number,number>={};
for(const source of sources){
 const bytes=fs.readFileSync(path.join(source.directory,'ram.bin')),initial=fs.readFileSync(path.join(source.directory,'initial.ram')),ramSha256=createHash('sha256').update(bytes).digest('hex');frames+=bytes.length/2048;
 const receipt=path.join(source.directory,'capture.json');if(fs.existsSync(receipt)&&JSON.parse(fs.readFileSync(receipt,'utf8')).ramSha256!==ramSha256)throw Error(`RAM digest changed ${source.id}`);
 receipts.push({input:source.kind,id:source.id,frames:bytes.length/2048,ramSha256});
 for(let row=0;row<bytes.length/2048;row++){
  const r=bytes.subarray(row*2048,(row+1)*2048),p=row?bytes.subarray((row-1)*2048,row*2048):initial;
  if(p[0x770]!==1||p[0x772]!==3||r[0x770]!==1||r[0x772]!==3||!p[0x14]||p[0x1b]!==46||p[0x23]<1||p[0x23]>=128||!r[0x14]||r[0x1b]!==46)continue;
  const before={state:p[0x23],y:p[0xd4]},after={state:r[0x23],y:r[0xd4]},frame=r[9],predicted=nativePowerupEmergence(before.state,before.y,frame),context={input:source.kind,id:source.id,row,level:`${r[0x75f]+1}-${r[0x75c]+1}`,engine:r[14],timer:r[0x747],kind:r[0x39]};rows++;if(context.timer)frozenRows++;engines[context.engine]=(engines[context.engine]??0)+1;
  const event={before,after,frame:frame&3,timerStopped:Boolean(context.timer)};
  const key=JSON.stringify(event);let e=transitions.get(key);if(!e){e={...event,count:0,examples:[]};transitions.set(key,e);}e.count++;if(e.examples.length<3)e.examples.push(context);
  if(predicted.state!==after.state||predicted.y!==after.y)diagnostics.push({...context,before,after,frame,predicted});
 }
}
let replay;
if(a['replay-entry']){
 const entry=a['replay-entry'],level=a['replay-level'];if(!level||!a['replay-frames'])throw Error('replay level/frames required');
 const directory=path.join(entry,'traces',level),receipt=JSON.parse(fs.readFileSync(path.join(entry,'receipts',level,'entrance.json'),'utf8')),initial=fs.readFileSync(path.join(directory,'initial.ram')),pads=fs.readFileSync(path.join(directory,'pads.bin')),ram=fs.readFileSync(path.join(directory,'ram.bin')),n=Number(a['replay-frames']),pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64');
 if(!Number.isInteger(n)||n<1||n>pads.length||n*2048>ram.length)throw Error('Invalid replay frames');
 replay={capture:path.basename(path.dirname(path.dirname(entry))),entry:path.basename(entry),level,frames:n,receipt,initialRam:pack(initial),pads:pack(pads.subarray(0,n)),ram:pack(ram.subarray(0,n*2048)),initialRamSha256:createHash('sha256').update(initial).digest('hex'),ramSha256:createHash('sha256').update(ram.subarray(0,n*2048)).digest('hex')};
}
fs.writeFileSync(a.out,JSON.stringify({replay,source:'Native PowerUpObjHandler slot5/id46 GrowThePowerUp precedes TimerControl branch; all surviving emergence state1..17 rows in mode1/task3. Active-object erasure/collection and initialization are separate lifecycles.',inputs:sources.length,frames,rows,frozenRows,engines,receipts,transitions:[...transitions.values()],diagnostics},null,2)+'\n');console.log(JSON.stringify({inputs:sources.length,frames,rows,frozenRows,engines,transitions:transitions.size,diagnostics:diagnostics.length}));

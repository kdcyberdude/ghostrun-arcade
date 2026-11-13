/** Native Jumpspring area-column allocations and idle offscreen erasures.
 * node tools/harness/native-spring-slot-events.mjs --traces DIR */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-spring-slot-events.json'}}});
if(!a.traces)throw Error('--traces is required');
const signed=v=>v<128?v:v-256,vertical=(r,s)=>({speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s]}),position=(r,s)=>({x:r[0x6e+s]*256+r[0x87+s],y:r[0xcf+s]+24,sub:r[0x401+s],...vertical(r,s)});
const births=[],erasures=[];
for(const directory of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,directory,'ram.bin');if(!fs.existsSync(file))continue;const data=fs.readFileSync(file);
 for(let frame=1;frame<data.length/2048;frame++){
  const p=data.subarray((frame-1)*2048,frame*2048),r=data.subarray(frame*2048,(frame+1)*2048);if(r[0x770]!==1)continue;
  const level=`${r[0x75f]+1}-${r[0x75c]+1}`,camera=r[0x71a]*256+r[0x71c];
  for(let slot=0;slot<6;slot++){
   if(r[15+slot]&&r[22+slot]===50&&(!p[15+slot]||p[22+slot]!==50))births.push({level,frame,slot,camera,preload:r[0x772]!==3,scroll:(r[0x71c]-p[0x71c])&255,clockBefore:[p[0x71f],p[0x73d]],clockAfter:[r[0x71f],r[0x73d]],task:[p[0x71f],r[0x71f]],column:[p[0x725]*256+p[0x726]*16,r[0x725]*256+r[0x726]*16],flags:Array.from(r.subarray(15,21)),beforeSub:Array.from(p.subarray(0x401,0x407)),beforeVertical:Array.from({length:6},(_,s)=>vertical(p,s)),after:position(r,slot),fixedY:r[0x58+slot]});
   if(p[15+slot]&&p[22+slot]===50&&!r[15+slot]&&p[0x772]===3&&r[0x772]===3&&p[14]===8&&r[14]===8&&p[0xe7]===r[0xe7]&&p[0xe8]===r[0xe8])erasures.push({level,frame,slot,camera,before:position(p,slot),after:position(r,slot)});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify({births,erasures})+'\n');console.log(`${births.length} native Spring births, ${erasures.length} normal erasures`);

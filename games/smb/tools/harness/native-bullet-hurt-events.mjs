/** Native frenzy-Bullet contact rows: fresh TimerControl, cached overlapping source boxes, retained X motor. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');
const box=(r,o)=>Array.from(r.subarray(o,o+4)),overlap=(p,e)=>p[2]>=e[0]&&p[0]<=e[2]&&p[3]>=e[1]&&p[1]<=e[3],state=(r,s)=>({x:r[0x6e+s]*256+r[0x87+s],fraction:r[0x401+s],y:(r[0xb6+s]-1)*256+r[0xcf+s],state:r[0x1e+s]}),events=[];
for(const level of fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const ram=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<ram.length/2048;frame++){
  const before=ram.subarray((frame-1)*2048,frame*2048),r=ram.subarray(frame*2048,(frame+1)*2048);
  if(before[0x747]||r[0x747]!==255||r[0x770]!==1||r[0x772]!==3)continue;
  for(let slot=0;slot<5;slot++)if(before[15+slot]&&r[15+slot]&&before[22+slot]===8&&r[22+slot]===8&&before[30+slot]===0&&r[30+slot]===0){
   const player=box(r,0x4ac),enemy=box(r,0x4b0+slot*4);if(!overlap(player,enemy))continue;
   events.push({level,frame,slot,engine:r[14],counter:r[9],master:r[0x747],player,enemy,before:state(before,slot),after:state(r,slot)});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Native PRG0 RunNormalEnemies: cached player/enemy bounding boxes overlap on a fresh TimerControl255 row; source PlayerEnemyCollision precedes MoveBulletBill. Captures every matching original32 event without model selection.',events})+'\n');console.log(events.length+' native frenzy Bullet hurt holds');

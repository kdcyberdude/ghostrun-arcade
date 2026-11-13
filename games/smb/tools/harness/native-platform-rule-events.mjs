/** Extract native MoveDropPlatform and linked BalancePlatform transitions.
 * node tools/harness/native-platform-rule-events.mjs TRACES [OUT]
 * Captures every distinct transition of all runs, using live RAM contact flags;
 * runtime gameplay never reads these fixtures. */
import fs from 'node:fs';
import path from 'node:path';
const [root,out='tests/fixtures/native-platform-rule-events.json']=process.argv.slice(2);
if(!root)throw Error('TRACES is required');
const rows=[],seen=new Set();
const state=(r,s)=>({y:r[0xcf+s],speed:r[0xa0+s]<128?r[0xa0+s]:r[0xa0+s]-256,force:r[0x434+s],fraction:r[0x417+s]});
for(const level of fs.readdirSync(root).filter(s=>/^\d-\d$/.test(s)).sort()){
 const raw=fs.readFileSync(path.join(root,level,'ram.bin'));
 const lifts=new Map();
 for(let frame=1;frame<raw.length/2048;frame++){
  const prev=raw.subarray((frame-1)*2048,frame*2048),next=raw.subarray(frame*2048,(frame+1)*2048);
  for(let slot=0;slot<5;slot++){
   if(!next[0x0f+slot]||![37,40].includes(next[0x16+slot])){lifts.delete(slot);continue;}
   if(!prev[0x0f+slot]||prev[0x16+slot]!==next[0x16+slot])lifts.set(slot,{frame,y:next[0xcf+slot],counter:next[0x09],x:next[0x6e+slot]*256+next[0x87+slot],sub:next[0x401+slot],fraction:next[0x417+slot]});
   const spawn=lifts.get(slot);
   // An elapsed-age trajectory ends at the first source timer/engine hold.
   // Resuming after a hold needs the then-current FrameCounter, not spawn+age.
   if(spawn&&next[0x16+slot]===40&&(next[0x770]!==1||next[0x747]||prev[0x0e]===8&&next[0x0e]!==8))spawn.stopped=true;
   if(!spawn||spawn.stopped||next[0x0e]!==8||next[0x747])continue;
   const row={level,frame,slot,id:next[0x16+slot],load:0,before:state(prev,slot),after:state(next,slot),spawnY:spawn.y,counter:spawn.counter,age:frame-spawn.frame,xByte:next[0x401+slot],spawnX:spawn.x,spawnSub:spawn.sub,spawnFraction:spawn.fraction};
   const key=JSON.stringify([row.id,spawn.y,spawn.counter&(row.id===37?7:3),row.age,spawn.fraction]);if(seen.has(key))continue;seen.add(key);rows.push(row);
  }
  if(next[0x0e]!==8||next[0x747]||prev[0x747])continue;
  for(let slot=0;slot<5;slot++){
   const id=prev[0x16+slot];if(!prev[0x0f+slot]||!next[0x0f+slot]||next[0x16+slot]!==id||![36,38,39,41,43,44].includes(id))continue;
   if(id===36&&(prev[0x1e+slot]>=128||next[0x46+slot]||prev[0xcf+slot]<=45||prev[0xcf+prev[0x1e+slot]]<=45))continue;
   const flag=next[0x3a2+slot],load=flag>=128?0:flag===slot?1:-1;
   const row={level,frame,slot,id,load,before:state(prev,slot),after:state(next,slot)};
   const key=JSON.stringify([id,load,row.before,row.after]);if(seen.has(key))continue;seen.add(key);rows.push(row);
  }
 }
}
fs.writeFileSync(out,JSON.stringify(rows)+'\n');console.log(`${rows.length} native platform transitions`);

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
 for(let frame=1;frame<raw.length/2048;frame++){
  const prev=raw.subarray((frame-1)*2048,frame*2048),next=raw.subarray(frame*2048,(frame+1)*2048);
  if(next[0x0e]!==8||next[0x747]||prev[0x747])continue;
  for(let slot=0;slot<5;slot++){
   const id=prev[0x16+slot];if(!prev[0x0f+slot]||!next[0x0f+slot]||next[0x16+slot]!==id||![36,41].includes(id))continue;
   if(id===36&&(prev[0x1e+slot]>=128||next[0x46+slot]||prev[0xcf+slot]<=45||prev[0xcf+prev[0x1e+slot]]<=45))continue;
   const flag=next[0x3a2+slot],load=flag>=128?0:flag===slot?1:-1;
   const row={level,frame,slot,id,load,before:state(prev,slot),after:state(next,slot)};
   const key=JSON.stringify([id,load,row.before,row.after]);if(seen.has(key))continue;seen.add(key);rows.push(row);
  }
 }
}
fs.writeFileSync(out,JSON.stringify(rows)+'\n');console.log(`${rows.length} native platform transitions`);

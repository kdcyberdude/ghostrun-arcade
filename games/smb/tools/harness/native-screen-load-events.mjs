/** Retain every native InitializeArea / ScreenRoutines transition, including time-up and pipe loads.
 * npx node tools/harness/native-screen-load-events.mjs --traces DIR --out tests/fixtures/native-screen-load-events.json */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');
const fields=['task','engine','screen','disable','timer','columns'],addresses=[0x772,14,0x73c,0x774,0x7a0,0x71e],events=[];
const state=r=>addresses.map(address=>r[address]);
for(const level of fs.readdirSync(a.traces).filter(level=>/^\d-\d$/.test(level)).sort()){
 const dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin'));let before=fs.readFileSync(path.join(dir,'initial.ram'));
 for(let frame=0;frame<ram.length/2048;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048);
  if(before[0x770]===1&&r[0x770]===1&&before[0x772]<3&&r[0x772]<=3){
   const flags=Number(Boolean(before[0x759]))|Number(Boolean(before[0x752]||before[0x74e]!==3&&before[0x769]))*2;
   events.push([level,frame,state(before),flags,Number(before[0x77f]!==20&&r[0x77f]===20),state(r)]);
  }
  before=r;
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Native PRG0 RAM; tuple: level,frame,before,timeUp|skipIntermediate<<1,intervalTick,after',fields,events})+'\n');console.log(`${events.length} native screen/load transitions`);

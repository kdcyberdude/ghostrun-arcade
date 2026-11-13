/** Retain native NMI/InitializeGame/RunGameTimer transitions. Excludes the separately owned flag-tally writers (engines4/5) and area reset dispatch6.
 * node tools/harness/native-game-timer-events.mjs --traces DIR --out tests/fixtures/native-game-timer-events.json */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');
const digits=r=>r[0x7f8]*100+r[0x7f9]*10+r[0x7fa],unique=new Map();let checked=0,heldRows=0;
for(const level of fs.readdirSync(a.traces).filter(level=>/^\d-\d$/.test(level)).sort()){
 const dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin'));let before=fs.readFileSync(path.join(dir,'initial.ram'));
 for(let frame=0;frame<ram.length/2048;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048);
  if(before[0x770]===1&&r[0x770]===1&&before[0x772]===3&&r[0x772]===3&&![4,5,6].includes(r[14])){
   const nmi=Number(r[9]===((before[9]+1)&255)&&before[0x747]<=1),setting=before[14]===0&&r[14]===7?r[0x715]:-1,engine=r[0x759]&&!before[0x759]?8:r[14];
   const state=[digits(before),before[0x787],Number(Boolean(before[0x757]))],input=[nmi,setting,r[0x770],engine,r[0xb5]],after=[digits(r),r[0x787],Number(Boolean(r[0x757]))],key=JSON.stringify([state,input,after]);
   const event=unique.get(key);if(event)event[5]++;else unique.set(key,[level,frame,state,input,after,1]);checked++;if(r[9]===before[9]&&!(r[0x776]&1))heldRows++;
  }
  before=r;
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Native PRG0 RAM; tuple level,firstFrame,[time,control,fetch],[NMI,InitializeGameSettingOrMinus1,mode,RunGameTimerEngine,yHigh],after,count; NMI reads actual FC progression (includes held CPU/PPU rows)',checked,heldRows,events:[...unique.values()]})+'\n');console.log(`${checked} native timer rows, ${unique.size} unique transitions, ${heldRows} held rows`);

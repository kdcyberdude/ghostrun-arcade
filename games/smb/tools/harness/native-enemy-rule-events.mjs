/** Native enemy-rule events from per-frame RAM traces (one directory per level with ram.bin, 2048 bytes per frame), for tests/native-enemy-rules.test.ts.
 *   node tools/harness/native-enemy-rule-events.mjs --traces DIR [--out tests/fixtures/native-enemy-rule-events.json]
 * Each event holds only the native bytes a rule reads and the bytes it produced, so a later recording of the same levels can be dropped in and re-checked.
 * RAM roles (SMB disassembly names): enemy slot s flag 0x0F+s, id 0x16+s, state 0x1E+s, page 0x6E+s, x 0x87+s, y page 0xB6+s, y 0xCF+s, speed 0xA0+s, move force 0x434+s,
 * fraction (YMF dummy) 0x417+s, EnemyIntervalTimer 0x796+s; Mario x 0x6D/0x86; camera 0x71A/0x71C; FrameCounter 0x09; PseudoRandomBitReg 0x7A7..0x7AD; IntervalTimerControl 0x77F;
 * cannon table page/x/y/timer 0x46B/0x471/0x477/0x47D; AreaType 0x74E; BitMFilter 0x6DD; engine 0x0E (8 play). Read-only measurement tooling. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';

const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-enemy-rule-events.json'}}});
if(!a.traces)throw Error('--traces is required');
const signed=v=>v<128?v:v-256;
const out={source:'per-frame RAM traces of the 32 v2 level recordings (ram.bin); rows are frame indices of each trace',cannonObjects:[],cannonTimerRows:[],podobooLaunches:[],intervalTicks:[],gravityRows:[],frenzyBullets:[],lakituRows:[],spinyEggs:[],spinyLandings:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file),n=d.length/2048,R=f=>d.subarray(f*2048,(f+1)*2048);
 const world=Number(level[0]),mask=world>=7?7:15;let timerRow=0;
 for(let f=1;f<n;f++){
  const p=R(f-1),r=R(f);
  if(r[0x770]!==1||p[0x770]!==1)continue;
  const play=p[0x0e]===8&&r[0x0e]===8;
  // Bullet Bill cannon objects (id 51) made this row, and whether the next row keeps them (BulletBillHandler state 0)
  if(f+1<n)for(let s=0;s<3;s++)if(r[0xf+s]&&r[0x16+s]===51&&r[0x1e+s]===0&&!(p[0xf+s]&&p[0x16+s]===51)){
   const q=R(f+1),x=r[0x6e+s]*256+r[0x87+s];
   out.cannonObjects.push({level,row:f,slot:s,x,marioNext:q[0x6d]*256+q[0x86],cameraNext:q[0x71a]*256+q[0x71c],kept:Boolean(q[0xf+s]&&q[0x16+s]===51)});
  }
  // cannon table timers: every play row with a stable, loaded table in a non-water area; slot s is busy at its turn when it held an object that was not made this row,
  // or held a cannon object that the pass removed. Every 40th such row is kept (and every row with an attempt).
  const entries=[0,1,2,3,4,5].map(k=>[p[0x46b+k],p[0x471+k],p[0x477+k]]);
  if(play&&r[0x74e]!==0&&entries.some(e=>e[0])&&entries.every((e,k)=>e[0]===r[0x46b+k]&&e[1]===r[0x471+k]&&e[2]===r[0x477+k])){
   const prev=[0,1,2,3,4,5].map(k=>p[0x47d+k]),next=[0,1,2,3,4,5].map(k=>r[0x47d+k]);
   const busy=[0,1,2].map(s=>{const made=r[0xf+s]&&r[0x16+s]===51&&r[0x1e+s]===0&&!(p[0xf+s]&&p[0x16+s]===51);const removed=p[0xf+s]&&p[0x16+s]===51&&!r[0xf+s];return Boolean(r[0xf+s]&&!made||removed);});
   const attempt=next.some((t,k)=>t===14&&prev[k]!==14);
   if(attempt||timerRow++%40===0)out.cannonTimerRows.push({level,row:f,mask,loaded:entries.map(e=>e[0]>0),prev,bytes:[1,2,3].map(k=>r[0x7a7+k]),busy,next});
  }
  for(let s=0;s<5;s++){
   if(!r[0xf+s])continue;
   const id=r[0x16+s];
   // lava Podoboo (id 12) relaunch: EnemyIntervalTimer was 0
   if(id===12&&p[0xf+s]&&p[0x16+s]===12&&p[0x796+s]<=1&&r[0x796+s]>=6&&signed(r[0xa0+s])<=-6)
    out.podobooLaunches.push({level,row:f,slot:s,byte:r[0x7a7+s+1],force:(r[0x434+s]-28)&255,timer:r[0x796+s],y:r[0xb6+s]*256+r[0xcf+s]});
   // MoveJ_EnemyVertically rows of Podoboos and jumping Paratroopas (id 14) that neither relaunched nor landed: every 128th row
   if((id===12||id===14)&&p[0xf+s]&&p[0x16+s]===id&&play&&(f+s)%128===0){
    const before={y:p[0xb6+s]*256+p[0xcf+s],speed:signed(p[0xa0+s]),force:p[0x434+s],fraction:p[0x417+s]},after={y:r[0xb6+s]*256+r[0xcf+s],speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s]};
    if(after.speed!==-7&&after.speed!==-3||before.speed===after.speed)out.gravityRows.push({level,row:f,id,before,after});
   }
   // frenzy Bullet Bill (id 8) made this row
   if(id===8&&!(p[0xf+s]&&p[0x16+s]===8))out.frenzyBullets.push({level,row:f,slot:s,byte:r[0x7a7+s],bagBefore:p[0x6dd],bagAfter:r[0x6dd],y:r[0xcf+s]});
  }
  // Lakitu (id 17) normal-play rows: [pre-step x, Mario x, Player_X_Speed $57, ScrollAmount $0775, state before, dir $A0 and speed $58 before, then after] (MoveLakitu)
  for(let s=0;s<5;s++)if(r[0x0e]===8&&r[0xf+s]&&r[0x16+s]===17&&p[0xf+s]&&p[0x16+s]===17&&!(p[0x1e+s]&0x20))
   out.lakituRows.push([level,f,p[0x6e+s]*256+p[0x87+s],r[0x6d]*256+r[0x86],r[0x57],r[0x775],p[0x1e+s],p[0xa0+s],p[0x58+s],r[0xa0+s],r[0x58+s]]);
  // Spiny eggs (id 18, state 5) made this row (CreateSpiny): slot, Lakitu slot and x before/after its step, egg x, y and vertical bytes, the y fraction the slot was left with
  for(let s=0;s<5;s++)if(r[0xf+s]&&r[0x16+s]===18&&r[0x1e+s]===5&&!(p[0xf+s]&&p[0x16+s]===18&&p[0x1e+s]===5)){
   const l=[0,1,2,3,4].find(k=>r[0xf+k]&&r[0x16+k]===17);if(l===undefined)continue;
   out.spinyEggs.push({level,row:f,slot:s,lakituSlot:l,lakituBefore:p[0x6e+l]*256+p[0x87+l],lakituAfter:r[0x6e+l]*256+r[0x87+l],lakituY:r[0xcf+l],x:r[0x6e+s]*256+r[0x87+s],y:r[0xcf+s],
    speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s],slotFraction:p[0x417+s],timerBefore:p[0x78f],timerAfter:r[0x78f],marioY:r[0xce]});
  }
  // Spiny landings (state 5 egg or 1 faller -> 0): FrameCounter, Mario x and the Spiny's pre-step x, the speed byte set
  for(let s=0;s<5;s++)if(r[0xf+s]&&r[0x16+s]===18&&p[0xf+s]&&p[0x16+s]===18&&(p[0x1e+s]===5||p[0x1e+s]===1)&&r[0x1e+s]===0)
   out.spinyLandings.push({level,row:f,from:p[0x1e+s],frame:r[0x09],mario:r[0x6d]*256+r[0x86],x:p[0x6e+s]*256+p[0x87+s],speed:r[0x58+s]});
  // interval timers: IntervalTimerControl wraps 0 -> 20 and every running EnemyIntervalTimer of a live Podoboo counts down
  if(play&&[0,1,2,3,4].some(s=>r[0xf+s]&&r[0x16+s]===12&&p[0xf+s]&&p[0x16+s]===12))
   out.intervalTicks.push({level,row:f,control:p[0x77f],controlNext:r[0x77f],timers:[0,1,2,3,4].map(s=>p[0xf+s]&&p[0x16+s]===12&&r[0x16+s]===12?[p[0x796+s],r[0x796+s]]:null)});
 }
}
// keep the interval rows small: the wrap rows and every 210th other row
out.intervalTicks=out.intervalTicks.filter((t,i)=>t.control===0||i%210===0);
fs.writeFileSync(a.out,JSON.stringify(out).replace(/\{"level"/g,'\n{"level"').replace(/\["(\d-\d)"/g,'\n["$1"')+'\n');
console.log(Object.entries(out).filter(([,v])=>Array.isArray(v)).map(([k,v])=>`${k} ${v.length}`).join(', '));

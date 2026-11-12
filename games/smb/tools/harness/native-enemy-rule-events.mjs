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
const out={source:'per-frame RAM traces of the 32 v2 level recordings (ram.bin); rows are frame indices of each trace',cannonObjects:[],cannonTimerRows:[],podobooLaunches:[],intervalTicks:[],gravityRows:[],frenzyBullets:[],lakituRows:[],spinyEggs:[],spinyLandings:[],stopFrenzy:[],hammerRows:[],hammerLagRows:[],miscRows:[],hammerContacts:[],coinSpawns:[],miscOffscreenRows:[],blockAliasRows:[],specialFlagBirths:[],specialQueueRows:[],aboveBlockCoins:[]};
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
  // Stop_Frenzy queued by AreaFrenzy on a parser column; retained through task 7, consumed at the next available enemy pass.
  if(r[0x6cd]===24&&p[0x6cd]!==24){
   let end=f+1;while(end<n&&R(end)[0x6cd]===24)end++;
   out.stopFrenzy.push({level,row:f,column:r[0x725]*256+r[0x726]*16,camera:r[0x71a]*256+r[0x71c],task:r[0x71f],consumed:end});
  }
  if(play&&r[9]===p[9]&&[0,1,2,3,4].some(s=>r[15+s]&&r[22+s]===5)){
   out.hammerLagRows.push({level,row:f,frame:r[9],changes:Array.from({length:2048},(_,address)=>address).filter(address=>p[address]!==r[address]).map(address=>[address,p[address],r[address]]),oamBefore:p.subarray(0x200,0x300).toString('hex'),oamAfter:r.subarray(0x200,0x300).toString('hex')});
  }
  if(p[0x3ee]!==r[0x3ee]){
   const block=p[0x3ee],bufferLow=r[0x3e6+block],hitRow=r[0x3e4+block],page=r[0x3ea+block];
   if(hitRow>=16&&p[0x500+bufferLow+hitRow-16]===0xc2){
    const slot=Array.from({length:9},(_,s)=>s).reverse().find(s=>r[0x2a+s]===1&&p[0x2a+s]!==1);
    if(slot!==undefined)out.aboveBlockCoins.push({level,row:f,slot,bufferRow:hitRow-16,bufferLow,blockPage:page,before:{force:p[0x440+slot],fraction:p[0x423+slot]},after:{y:r[0xdb+slot],x:r[0x7a+slot]*256+r[0x93+slot],speed:signed(r[0xac+slot]),force:r[0x440+slot],fraction:r[0x423+slot]}});
   }
  }
  // Slot5 ownership: native FlagpoleObject creation and queued frenzy consumption, including the reserved-slot water generator.
  if(r[0x14]&&r[0x1b]===48&&(p[0x1b]!==48||p[0x14]!==r[0x14]))out.specialFlagBirths.push({level,row:f,beforeFlag:p[0x14],column:r[0x73]*256+r[0x8c]+8,flag:r[0x14],id:r[0x1b],x:r[0x73]*256+r[0x8c],y:r[0xd4],task:r[0x71f]});
  if(p[0x6cd]&&r[0x6cd]===0&&r[0xe]===8){
   const slot=Array.from({length:6},(_,s)=>s).find(s=>r[0xf+s]&&(!p[0xf+s]||p[0x16+s]!==r[0x16+s]));
   if(slot!==undefined)out.specialQueueRows.push({level,row:f,queue:p[0x6cd],slot,flag:r[0x14],id:r[0x1b],buffer:r[0x6cb],taskBefore:p[0x71f]});
  }
  // Shared misc objects: source byte-state motor and cached bounding boxes; normal game-engine rows only.
  if(p[0xe]===8&&(r[0xe]===8||r[0xe]===11)&&r[9]===((p[9]+1)&255)&&p[0x747]===0&&r[0x747]===0){
   if(f%4===0&&[0,1].some(s=>p[0x26+s])){
    const blocks=z=>Array.from({length:4},(_,s)=>({slot:s,state:s<2?z[0x26+s]:0,x:z[0x76+s]*256+z[0x8f+s],y:(z[0xbe+s]-1)*256+z[0xd7+s],speed:signed(z[0xa8+s]),force:z[0x43c+s],fraction:z[0x41f+s]}));
    out.blockAliasRows.push({level,row:f,before:blocks(p),after:blocks(r)});
   }
   const live=Array.from({length:9},(_,s)=>s).filter(s=>p[0x2a+s]||r[0x2a+s]);
   for(const s of live){
    const before={state:p[0x2a+s],speed:signed(p[0xac+s]),force:p[0x440+s],fraction:p[0x423+s],y:(p[0xc2+s]-1)*256+p[0xdb+s],x:p[0x7a+s]*256+p[0x93+s]},after={state:r[0x2a+s],speed:signed(r[0xac+s]),force:r[0x440+s],fraction:r[0x423+s],y:(r[0xc2+s]-1)*256+r[0xdb+s],x:r[0x7a+s]*256+r[0x93+s]};
    const camera=r[0x71a]*256+r[0x71c],box=Array.from(r.subarray(0x4ac+36+s*4,0x4ac+40+s*4));
    if((before.state===0x81||before.state>0&&before.state<48)&&(f%16===0||before.state!==after.state))out.miscRows.push({level,row:f,slot:s,frame:r[9],scroll:r[0x775],before,after,camera,box,checkX:r[0x76+s]*256+r[0x8f+s]});
    if(after.state===1&&(before.state===0||before.state>=0x80))out.coinSpawns.push({level,row:f,slot:s,busy:Array.from({length:9},(_,k)=>k).filter(k=>p[0x2a+k])});
    const prior=live.filter(k=>k>s&&!(p[0x2a+k]===47&&r[0x2a+k]===0)).at(0);
    const priorMisc=prior===undefined?undefined:{x:r[0x7a+prior]*256+r[0x93+prior],y:(r[0xc2+prior]-1)*256+r[0xdb+prior],camera};
    if(before.state===0x81)out.hammerContacts.push({priorMisc,level,row:f,slot:s,frame:r[9],offscreen:p[0x3d6],player:Array.from(r.subarray(0x4ac,0x4b0)),box:Array.from(p.subarray(0x4ac+36+s*4,0x4ac+40+s*4)),latch:Boolean(p[0x6be+s]),nextLatch:Boolean(r[0x6be+s]),speed:signed(p[0x64+s]),nextSpeed:signed(r[0x64+s])});
   }
   const last=live.filter(s=>!(p[0x2a+s]===47&&r[0x2a+s]===0)).at(0);
   if(last!==undefined&&f%16===0)out.miscOffscreenRows.push({level,row:f,x:r[0x7a+last]*256+r[0x93+last],y:(r[0xc2+last]-1)*256+r[0xdb+last],camera:r[0x71a]*256+r[0x71c],bits:r[0x3d6]});
  }
  // Hammer Bros: pre-step slot bytes and native outputs, with the block-buffer support read by ChkUnderEnemy.
  if(play&&r[9]===((p[9]+1)&255))for(let s=0;s<5;s++)if(r[0xf+s]&&r[0x16+s]===5&&p[0xf+s]&&p[0x16+s]===5&&!(p[0x1e+s]&0x20)&&!(r[0x1e+s]&0x20)&&r[0x747]===0&&p[0x747]===0){
   const x=p[0x6e+s]*256+p[0x87+s],y=p[0xcf+s],col=Math.floor((x+8)/16),row=(((y+24)&240)-32)&255;
   const supported=Boolean(r[0x500+((col>>4)&1)*0xd0+row+(col&15)]);
   const before={state:p[0x1e+s],jumpTimer:p[0x3c+s],throwTimer:p[0x3a2+s],frameTimer:p[0x78a+s],interval:r[0x796+s],speed:signed(p[0xa0+s]),force:p[0x434+s],fraction:p[0x417+s],y};
   const after={state:r[0x1e+s],jumpTimer:r[0x3c+s],throwTimer:r[0x3a2+s],frameTimer:r[0x78a+s],interval:r[0x796+s],speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s],y:r[0xcf+s]};
   const byte=r[0x7a8],misc=(byte&7)||(byte&8),guard=[4,4,4,5,5,5,6,6,6][misc],made=p[0x2a+misc]===0&&!r[0xf+guard];
   const sideCol=Math.floor((x+(p[0x46+s]===1?16:0))/16),sideRow=(((y+20)&240)-32)&255,sideTile=r[0x500+((sideCol>>4)&1)*0xd0+sideRow+(sideCol&15)];
   const sideBlocked=y>=32&&Boolean(sideTile)&&![0x26,0xc2,0xc3,0x5f,0x60].includes(sideTile);
   out.hammerRows.push({level,row:f,slot:s,before,after,x,mario:r[0x6d]*256+r[0x86],frame:r[9],random1:r[0x7a8+s],random2:r[0x7a9+s],hard:Boolean(r[0x6cc]),supported,sideBlocked,screenX:x-(r[0x71a]*256+r[0x71c]),made,xSpeed:signed(r[0x58+s])});
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

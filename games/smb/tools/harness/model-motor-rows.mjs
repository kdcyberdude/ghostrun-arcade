#!/usr/bin/env node
// Exports retained model-play PPU traces as one-step speed rows for tools/fidelity-lab/native-motor-score.ts. A pad byte acts on its own row, so row i's transition uses pad i.
//   node tools/harness/model-motor-rows.mjs <out.json> [evidence/local/model-play/it000910 ...]
import fs from 'node:fs';
import path from 'node:path';
const [out,...args]=process.argv.slice(2),base='evidence/local/model-play';
const dirs=args.length?args:fs.readdirSync(base).map(d=>path.join(base,d));
const control=r=>r.mode===1&&r.task===3&&r.engine===8&&!(r.yPage>1)&&!(r.world%5===2&&r.stage===2); // not rows below the screen (pit fall before the death) nor the swim levels 2-2 and 7-2, which this ground/air score does not model
// Landing while still rising: the first zero-vy row is the apex frame, the landing shows on the second; an apex never stays flat at vy 0 for more than 2 further rows.
const landedRising=(rows,i)=>i>=2&&rows[i-2].vy===0&&[i,i+1,i+2].every(k=>rows[k]&&rows[k].y===rows[i-1].y&&rows[k].vy===0);
const rowsOut=[];
for(const dir of dirs)for(const f of fs.readdirSync(dir).filter(n=>/^mood\d-ppu-native\.jsonl$/.test(n))){
 const stem=path.join(dir,f.replace('-ppu-native.jsonl','')),rows=fs.readFileSync(stem+'-ppu-native.jsonl','utf8').trim().split('\n').map(JSON.parse);
 const pads=JSON.parse(fs.readFileSync(stem+'-actions.json','utf8')).actions.flatMap(([m,n])=>Array(n).fill(m));
 const eff=m=>[[1,'U'],[2,'D'],[4,'L'],[8,'R'],[16,'A'],[32,'B']].filter(([b])=>m&b).map(([,c])=>c).join('');
 let run=0,state=null,lastdy=0; // ground/air tracking as in native-motor-rows.py: a ground step precedes the first y change; an air spell ends on the first flat row after falling
 for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i];if(!control(a)||!control(b)||a.world!==b.world||a.stage!==b.stage||Math.abs(b.x-a.x)>8){run++;state=null;lastdy=0;continue;}
  let aira;
  if(a.suby!==undefined&&b.suby!==undefined&&a.vyFrac!==undefined&&b.vyFrac!==undefined){
   // Native neutral walk-offs stop braking on the first speed-fraction row, before y's integer byte changes.
   const dy=b.y-a.y+(b.suby-a.suby)/256,av=a.vy+a.vyFrac/256,bv=b.vy+b.vyFrac/256;
   state??=dy!==0||av!==0||bv>0?'air':'ground';
   if(state==='air'&&dy===0&&av===0&&bv===0)state='ground';
   aira=state==='air';
   if(state==='ground'&&(dy!==0||bv!==0)){state='air';if(bv>0)aira=true;}
  }else{
  const dy=b.y-a.y;state??=dy!==0||a.vy!==0?'air':'ground';
  if(state==='air'&&dy===0&&a.vy===0&&(lastdy>0||landedRising(rows,i)))state='ground';
  aira=state==='air';if(state==='ground'&&dy!==0){state='air';lastdy=0;}if(state==='air'&&dy!==0)lastdy=Math.sign(dy);
  // A walk-off is already in the air on the row of its first y change and the row before it (neutral native walk-offs stop braking there).
  if(!aira&&dy>0){const p=rowsOut[rowsOut.length-1];if(p&&p.cap===stem&&p.case===String(run)&&p.i===i-1&&!p.aira)p.aira=p.air=true;aira=true;}
  }
  rowsOut.push({cap:stem,case:String(run),i,eff:eff(pads[i]),Sa:a.vx,Sb:b.vx,xa:a.x,xb:b.x,ya:a.y,yb:b.y,air:state==='air',aira,size:a.size});}
}
fs.writeFileSync(out,JSON.stringify(rowsOut));console.log(rowsOut.length,'rows ->',out);

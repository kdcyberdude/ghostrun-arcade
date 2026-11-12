/** Extract offscreen InitBowserFlame births from native RAM. Mouth flames are excluded because their origin is Bowser, not ScreenRight+32.
 * node tools/harness/native-castle-flames.mjs --traces DIR --output data/native-castle-flame-events.json
 * Read-only evidence extraction; the game never reads these events. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},output:{type:'string'}}});
if(!a.traces||!a.output)throw Error('--traces and --output required');
const events=[];
for(const level of ['1-4','2-4','3-4','4-4','5-4','6-4','7-4']){
 const bytes=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<bytes.length/2048;frame++){
  const r=bytes.subarray(frame*2048,(frame+1)*2048),p=bytes.subarray((frame-1)*2048,frame*2048);
  if(r[14]!==8||r[0x770]!==1||Array.from({length:5},(_,s)=>s).some(s=>r[15+s]&&r[22+s]===45))continue;
  for(let slot=0;slot<5;slot++)if(r[15+slot]&&r[22+slot]===21&&(!p[15+slot]||p[22+slot]!==21)){
   const camera=r[0x71a]*256+r[0x71c],x=r[0x6e+slot]*256+r[0x87+slot];
   if(x!==camera+287)throw Error(`Unexpected offscreen flame origin ${level}:${frame}`);
   events.push({level,frame,slot,camera,random:Array.from(r.subarray(0x7a7,0x7ae)),usedSlots:Array.from({length:5},(_,s)=>s).filter(s=>s!==slot&&r[15+s]),timerBefore:p[0x78f],counterBefore:p[0x367],timer:r[0x78f],counter:r[0x367],x,y:r[0xcf+slot],target:r[0x417+slot]});
  }
 }
}
fs.writeFileSync(a.output,JSON.stringify({method:'InitBowserFlame native RAM births; addresses and extraction in tools/harness/native-castle-flames.mjs. No runtime replay data.',events},null,1)+'\n');
console.log(`${events.length} native offscreen flame births`);

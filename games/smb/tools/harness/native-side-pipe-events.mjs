/** Native EnterSidePipe/AutoControlPlayer input and output bytes.
 * node tools/harness/native-side-pipe-events.mjs --traces DIR [--out FILE] */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-side-pipe-events.json'}}});
if(!a.traces)throw Error('--traces is required');
const signed=x=>(x<<24)>>24,motor=r=>({speed:signed(r[0x57])*256+r[0x705],absolute:r[0x700],facing:r[0x33]===2?-1:1,moving:r[0x45]===1?1:r[0x45]===2?-1:0,runningTimer:r[0x783],runningSpeed:r[0x703],blockedRight:!(r[0x490]&1),blockedLeft:!(r[0x490]&2)}),x=r=>r[0x6d]*256+r[0x86]+r[0x400]/256,events=[];
for(const level of fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const b=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<b.length/2048;frame++){
  const p=b.subarray((frame-1)*2048,frame*2048),r=b.subarray(frame*2048,(frame+1)*2048);
  if(p[0x770]!==1||p[0x772]!==3||r[0x770]!==1||!((p[14]===2&&r[14]===2)||(p[14]===7&&r[14]===7&&p[0x6de]>0&&p[0x3c4]!==0)))continue;
  events.push({level,frame,water:p[0x74e]===0,entrance:p[14]===7,grounded:p[0x1d]===0,camera:r[0x71a]*256+r[0x71c],before:{x:x(p),change:p[0x6de],motor:motor(p)},after:{x:x(r),change:r[0x6de],motor:motor(r)}});
 }
}
fs.writeFileSync(a.out,JSON.stringify(events).replace(/\{"level"/g,'\n{"level"')+'\n');console.log(`${events.length} native side pipe rows`);

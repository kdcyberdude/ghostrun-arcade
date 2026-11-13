/** Native Entrance_GameTimerSetup and falling PlayerEntrance evidence.
 * node tools/harness/native-entrance-events.mjs --traces DIR --out FILE
 * DIR may contain level subdirectories, or be a full mood capture with ram.bin. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');
const entries=fs.existsSync(path.join(a.traces,'ram.bin'))?['.']:fs.readdirSync(a.traces).filter(x=>/^\d-\d$/.test(x)).sort();
const state=r=>({y:r[0xce],state:r[0x1d],speed:r[0x9f]<<24>>24,force:r[0x433],fraction:r[0x416],engine:r[14]}),events=[];
for(const level of entries){
 const ram=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<ram.length/2048;frame++){
  const p=ram.subarray((frame-1)*2048,frame*2048),r=ram.subarray(frame*2048,(frame+1)*2048);
  if(p[0x770]!==1||r[0x770]!==1||p[0x772]!==3||r[0x772]!==3)continue;
  if(p[14]===0&&r[14]===7)events.push({level,frame,setup:{control:r[0x710],alternate:r[0x752],page:r[0x71a],x:r[0x6d]*256+r[0x86],y:r[0xce],state:r[0x1d],forceDown:r[0x70a],sprite:r[0x3c4]}});
  if(p[14]!==7||p[0x752]===2||p[0x74e]===0||p[0xce]>48||p[0x710]>=6||p[0x747])continue;
  events.push({level,frame,control:p[0x710],alternate:p[0x752],override:p[0x754],sprite:p[0x3c4],gravity:p[0x70a],before:state(p),after:state(r)});
 }
}
fs.writeFileSync(a.out,JSON.stringify(events).replace(/\{"level"/g,'\n{"level"')+'\n');console.log(`${events.length} native entrance transitions`);

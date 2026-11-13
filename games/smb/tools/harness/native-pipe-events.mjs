/** Capture VerticalPipeEntry input/output RAM on engine3 GameCore rows.
 * node tools/harness/native-pipe-events.mjs --traces DIR [--out FILE]
 * --traces can be a v2 directory or one captured mood entry's traces. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-pipe-events.json'},source:{type:'string',default:'v2'}}});
if(!a.traces)throw Error('--traces is required');
const state=r=>({y:r[0xce],change:r[0x6de],camera:r[0x71a]*256+r[0x71c],xScroll:r[0x6ff],platformScroll:r[0x3a1]}),events=[];
for(const level of fs.readdirSync(a.traces).filter(x=>/^\d-\d$/.test(x)).sort()){
 const raw=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<raw.length/2048;frame++){
  const p=raw.subarray((frame-1)*2048,frame*2048),r=raw.subarray(frame*2048,(frame+1)*2048);
  if(p[0x770]!==1||p[0x772]!==3||p[0xe]!==3||r[0xe]!==3||r[0x770]!==1)continue;
  events.push({source:a.source,level,frame,screen:p[0x755],sideTimer:r[0x785],locked:Boolean(r[0x723]),before:state(p),after:state(r)});
 }
}
fs.writeFileSync(a.out,JSON.stringify(events).replace(/\{"level"/g,'\n{"level"')+'\n');console.log(`${events.length} native vertical pipe rows`);

/** Retain native AreaParserTasks transitions. Ignore PlayerHole/death/load writes to ScrollLock.
 * node tools/harness/native-area-control-events.mjs --traces DIR --output FILE */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},output:{type:'string'}}});if(!a.traces||!a.output)throw Error('--traces and --output required');
const events=[],column=r=>r[0x725]*16+r[0x726];
for(const level of fs.readdirSync(a.traces).filter(l=>l.endsWith('-4')&&l!=='8-4').sort()){
 const b=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let f=1;f<b.length/2048;f++){
  const r=b.subarray(f*2048,(f+1)*2048),p=b.subarray((f-1)*2048,f*2048),task=r[0x71f];
  if(r[0x770]!==1||p[0x770]!==1||r[14]!==8||p[14]!==8||r[0xb5]!==1||p[0xb5]!==1||r[0x71f]===p[0x71f]||Math.abs(column(r)-column(p))>1)continue;
  events.push({level,frame:f,task,before:{column:column(p),locked:Boolean(p[0x723])},after:{column:column(r),locked:Boolean(r[0x723])}});
 }
}
fs.writeFileSync(a.output,JSON.stringify({method:'Native AreaParserTasks state transitions; source and addresses in extractor. PlayerHole/death/InitializeArea changes excluded because they are different source owners.',events})+'\n');console.log(events.length+' parser transitions');

/** Capture individual native UpdScrollVar transitions from RAM. Buffer2 packet10
 * is RemoveCoin_Axe's pair of two-byte horizontal metatile updates. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-palette-queue.json'}}});if(!a.traces)throw Error('--traces is required');
// An NMI may interrupt the parser between setting task8 and running its first task;
// retain only complete FrameCounter steps with task0..7 at both boundaries.
const out={source:'Native UpdScrollVar / AreaParserTasks; $073d scroll accumulator, $071f task, $0773 VRAM selection, RemoveCoin_Axe 10-byte buffer2 packet',checked:0,events:[]};const seen=new Set();
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const data=fs.readFileSync(file);
 for(let f=1;f<data.length/2048;f++){
  const r=data.subarray(f*2048,(f+1)*2048),b=data.subarray((f-1)*2048,f*2048);
  if(r[0x770]!==1||r[0x772]!==3||![7,8].includes(r[14])||![7,8].includes(b[14])||r[0x750]!==b[0x750]||r[0x776]&1)continue;
  const camera=q=>q[0x71a]*256+q[0x71c],delta=camera(r)-camera(b);if(delta<0||delta>8||b[0x71f]>7||r[0x71f]>7||r[9]!==((b[9]+1)&255))continue;
  const e={level,frame:f,scroll:b[0x73d],task:b[0x71f],delta,remove:r[0x773]===6&&r[0x343]===2&&r[0x348]===2,after:[r[0x73d],r[0x71f],r[0x773]===6]};out.checked++;
  const key=JSON.stringify([e.scroll,e.task,e.delta,e.remove,e.after]);if(!seen.has(key)){seen.add(key);out.events.push(e);}
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(out.checked,out.events.length);

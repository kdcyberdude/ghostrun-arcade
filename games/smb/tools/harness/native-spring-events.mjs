/** Read source JumpspringHandler rows and RAM bytes from native captures.
 * node tools/harness/native-spring-events.mjs --traces DIR [--out FILE] */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-spring-events.json'}}});
if(!a.traces)throw Error('--traces is required');
const signed=n=>n<128?n:n-256,events=[];
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const b=fs.readFileSync(file);
 for(let frame=1;frame<b.length/2048;frame++){
  const p=b.subarray((frame-1)*2048,frame*2048),r=b.subarray(frame*2048,(frame+1)*2048);
  if((!p[0x70e]&&!r[0x70e])||p[0x747]||r[0x747]||p[0xe]!==8||r[0xe]!==8)continue;
  const slot=[0,1,2,3,4].find(s=>r[0xf+s]&&r[0x16+s]===50);if(slot===undefined)continue;
  const born=!p[0x70e],before=born?{control:1,timer:3,force:-7,compression:0}:{control:p[0x70e],timer:p[0x786],force:signed(p[0x6db]),compression:(p[0xcf+slot]-p[0x58+slot])/8};
  const after={control:r[0x70e],timer:r[0x786],force:signed(r[0x6db]),compression:(r[0xcf+slot]-r[0x58+slot])/8};
  const yBefore=born?(p[0xce]+signed(p[0x9f])+((p[0x416]+p[0x433])>>8))&0xf0:p[0xce];
  events.push({level,frame,slot,born,edgeA:Boolean((r[0xa]&128)&&!(p[0xd]&128)),before,after,yBefore,yAfter:r[0xce],speedAfter:signed(r[0x9f])});
 }
}
fs.writeFileSync(a.out,JSON.stringify(events).replace(/\{"level"/g,'\n{"level"')+'\n');console.log(`${events.length} native spring rows`);

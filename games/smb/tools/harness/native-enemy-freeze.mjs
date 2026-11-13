/** Native live Goomba OAM during the first arc death; TimerControl stops its animation. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},level:{type:'string'},out:{type:'string',default:'tests/fixtures/native-enemy-freeze.json'}}});if(!a.traces||!a.level)throw Error('--traces and --level are required');
const raw=fs.readFileSync(path.join(a.traces,a.level,'ram.bin')),rows=[];let started=false;
for(let f=0;f<raw.length/2048;f++){
 const r=raw.subarray(f*2048,(f+1)*2048);if(started&&r[14]!==11)break;if(r[14]!==11)continue;started=true;
 for(let slot=0;slot<5;slot++)if(r[15+slot]===1&&r[22+slot]===6&&r[30+slot]===0){
  const o=0x200+r[0x6e5+slot];if([8,12,16,20].some(k=>r[o+k]>=240))continue;
  rows.push({frame:f,slot,timer:r[0x747],sprites:[8,12,16,20].map(k=>({id:r[o+k+1],x:r[o+k+3],y:r[o+k]+1,flip:Boolean(r[o+k+2]&64)}))});break;
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Native first engine11 arc-death TimerControl $0747 and live Goomba OAM via $06e5+s',level:a.level,rows})+'\n');console.log(rows.length);

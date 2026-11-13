/** Extract every native retained Bullet Bill stomp and defeated motion transition.
 * node tools/harness/native-bullet-defeat-events.mjs --traces DIR */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-bullet-defeat-events.json'}}});
if(!a.traces)throw Error('--traces is required');
const signed=v=>v<128?v:v-256,state=(r,s)=>({x:r[0x6e+s]*256+r[0x87+s]+r[0x401+s]/256,y:r[0xb6+s]*256+r[0xcf+s]-256+24,speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s]});
const events=[];
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const data=fs.readFileSync(file);
 for(let frame=1;frame<data.length/2048;frame++){
  const p=data.subarray((frame-1)*2048,frame*2048),r=data.subarray(frame*2048,(frame+1)*2048);
  if(p[14]!==8||r[14]!==8||((r[9]-p[9])&255)!==1)continue;
  for(let slot=0;slot<5;slot++){
   const erased=p[15+slot]===1&&r[15+slot]===0&&[8,51].includes(p[22+slot])&&Boolean(p[30+slot]&32);
   const id=erased?p[22+slot]:r[22+slot];if(!erased&&(![8,51].includes(id)||p[22+slot]!==id||p[15+slot]!==1||r[15+slot]!==1||!(r[30+slot]&32)))continue;
   events.push({level,frame,slot,id,erased,held:r[0x747]!==0,stomp:!(p[30+slot]&32),before:state(p,slot),after:state(r,slot),priorXSpeed:signed(p[0x58+slot]),xSpeed:signed(r[0x58+slot])});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(events)+'\n');console.log(`${events.length} native Bullet defeat rows, ${events.filter(e=>e.stomp).length} stomps`);

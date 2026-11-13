/** Capture native FlagpoleRoutine's separate FNum motor and FlagpoleGfxHandler OAM. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-flag-pictures.json'}}});if(!a.traces)throw Error('--traces is required');
const out={source:'Native FlagpoleObject slot5 $14/$1b/$73/$8c/$d4, FNum $010d/$010e, score $010f and collision $070f; OAM via Enemy_SprDataOffset+5 $06ea',checked:0,events:[],moves:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const data=fs.readFileSync(file);let prior;
 for(let f=1;f<data.length/2048;f++){
  const r=data.subarray(f*2048,(f+1)*2048),b=data.subarray((f-1)*2048,f*2048);if(r[0x770]!==1||r[0x772]!==3||r[0x1b]!==48||!r[0x14])continue;
  if(b[0x1b]===48&&b[0x14]&&(r[0x10d]!==b[0x10d]||r[0x10e]!==b[0x10e]))out.moves.push({level,frame:f,before:[b[0x10d],b[0x10e]],after:[r[0x10d],r[0x10e]]});
  const o=0x200+r[0x6ea],slot={flag:r[0x14],id:r[0x1b],x:r[0x73]*256+r[0x8c],y:r[0xd4]},number=r[0x70f]?{y:r[0x10d],score:[5000,2000,800,400,100][r[0x10f]]}:undefined,camera=r[0x71a]*256+r[0x71c];
  const sprites=r[o]>=240?[]:[0,4,8,...number?[12,16]:[]].map(k=>({tile:r[o+k+1],x:r[o+k+3],y:r[o+k]+1}));out.checked++;
  const key=JSON.stringify([slot,number,camera,sprites]);if(key!==prior){out.events.push({level,frame:f,slot,number,camera,sprites});prior=key;}
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(out.checked,out.events.length,out.moves.length);

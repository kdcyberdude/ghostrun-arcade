/** Read stable native shell OAM after CheckForBloober/CheckToAnimateEnemy. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-shell-pictures.json'},corpus:{type:'string'}}});if(!a.traces)throw Error('--traces is required');
const out={source:'Native engine8 RAM/OAM: stable shell state4; tuples level,frame,id,FrameCounter,EnemyIntervalTimer,Enemy_State,pre-handler worldX/feetY,camera,bottom-four [CHR,x,y,attributes] bytes',checked:0,rows:[]},seen=new Set();
const inputs=fs.readdirSync(a.traces).sort().map(level=>({level,file:path.join(a.traces,level,'ram.bin'),from:1,to:Infinity}));
if(a.corpus)for(const e of JSON.parse(fs.readFileSync('tests/fixtures/native-shell-revivals.json')).events)inputs.push({level:e.file,file:path.join(a.corpus,e.file),from:Math.max(1,e.frame-128),to:e.frame});
for(const {level,file,from,to}of inputs){
 if(!fs.existsSync(file))continue;const data=fs.readFileSync(file);
 for(let frame=from;frame<=Math.min(to,data.length/2048-1);frame++){
  const r=data.subarray(frame*2048,(frame+1)*2048),p=data.subarray((frame-1)*2048,frame*2048);if(r[0x770]!==1||r[14]!==8||r[0x747])continue;
  for(let slot=0;slot<5;slot++){
   const id=r[22+slot];if(id>3||r[15+slot]!==1||p[15+slot]!==1||p[22+slot]!==id||![4,0x84].includes(r[30+slot])||p[30+slot]!==r[30+slot])continue;
   const o=0x200+r[0x6e5+slot],tiles=Array.from({length:4},(_,k)=>r[o+(k+2)*4+1]);if(Array.from({length:4},(_,k)=>r[o+(k+2)*4]).some(y=>y>=240))continue;
   out.checked++;const sprites=Array.from({length:4},(_,k)=>[r[o+(k+2)*4+1],r[o+(k+2)*4+3],r[o+(k+2)*4],r[o+(k+2)*4+2]]);const key=JSON.stringify([id,r[9]&8,r[0x796+slot],r[30+slot],tiles,sprites.map(t=>t[3])]);if(seen.has(key))continue;seen.add(key);out.rows.push([level,frame,id,r[9],r[0x796+slot],r[30+slot],p[0x6e+slot]*256+p[0x87+slot],p[0xcf+slot]+24,r[0x71a]*256+r[0x71c],...sprites.flat()]);
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(out.checked,'native shell pictures;',out.rows.length,'distinct cases');

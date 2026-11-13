/** Native Hammer Bro EnemyGfxHandler cells/facing before the movement and throw pass.
 * node tools/harness/native-hammer-bro-pictures.mjs --traces DIR [--out tests/fixtures/native-hammer-bro-pictures.json]
 * Captures fully visible, live, normal game-engine rows; tuples [frame,counter,preState,preDirection,tile0..tile5].
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-hammer-bro-pictures.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={source:'Native v2 RAM: pre-step Hammer Bro state$1E+s/direction$46+s, FrameCounter$09, six OAM tile bytes and horizontal flip via Enemy_SprDataOffset$06E5+s',checked:0,levels:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file),rows=[];let previous='';
 for(let f=1;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),p=d.subarray((f-1)*2048,f*2048);
  if(r[14]!==8||r[0x747]!==0||r[0x770]!==1)continue;
  for(let s=0;s<5;s++){
   if(r[15+s]!==1||p[15+s]!==1||r[22+s]!==5||p[22+s]!==5||(p[30+s]&0x20)||(r[30+s]&0x20))continue;
   const o=0x200+r[0x6e5+s];if(r[o+3]>239||Array.from({length:6},(_,k)=>r[o+k*4]).some(y=>y>=240))continue;
   const tiles=Array.from({length:6},(_,k)=>r[o+k*4+1]),flip=Number(Boolean(r[o+2]&64)),key=JSON.stringify([p[30+s],p[0x46+s],...tiles,flip]);out.checked++;
   if(key!==previous||f%8===0)rows.push([f,r[9],p[30+s],p[0x46+s],...tiles,flip]);previous=key;
  }
 }
 if(rows.length)out.levels.push({level,rows});
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`${out.checked} native Hammer Bro pictures`);

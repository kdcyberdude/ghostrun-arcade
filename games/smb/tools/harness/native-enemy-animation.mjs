/** Native ordinary live-enemy graphics evidence (EnemyGfxHandler, CheckForSecondFrame).
 * node tools/harness/native-enemy-animation.mjs --traces DIR [--out tests/fixtures/native-enemy-animation.json]
 * Draw state precedes this frame's collisions/movement. Capture stable live states0/1, no global timer freeze, interval timer<5,
 * fully visible sprite rows, and real slots (flag1, excluding Bowser duplicate/dummy slots). Keep each graphics change and every8th row.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-enemy-animation.json'}}});
if(!a.traces)throw Error('--traces is required');
const kinds={0:'koopa',1:'redKoopa',2:'beetle',3:'redKoopa',4:'koopa',10:'cheep',11:'cheep',13:'piranha',14:'paratroopa',15:'paratroopa',16:'paratroopa',18:'spiny'};
const out={source:'Native v2 RAM: FrameCounter $09, live enemy ID $16+s, pre-step state $1E+s, interval timer $0796+s and all six OAM tile bytes via Enemy_SprDataOffset $06E5+s; tuples [frame,counter,tile0..tile5]',checked:0,cases:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file),groups=new Map(),prior=new Map();
 for(let f=1;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),p=d.subarray((f-1)*2048,f*2048);
  if(r[14]!==8||r[0x747]!==0||r[0x770]!==1)continue;
  for(let s=0;s<5;s++){
   const id=r[22+s],kind=kinds[id];if(!kind||r[15+s]!==1||p[15+s]!==1||p[22+s]!==id||p[30+s]>1||r[0x796+s]>=5)continue;
   const o=0x200+r[0x6e5+s];if(r[o+3]>239||Array.from({length:6},(_,k)=>r[o+k*4]).some(y=>y>=240))continue;
   const tiles=Array.from({length:6},(_,k)=>r[o+k*4+1]),key=JSON.stringify([...tiles].sort((a,b)=>a-b));out.checked++;
   if(key!==prior.get(s)||f%8===0){if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push([f,r[9],...tiles]);}prior.set(s,key);
  }
 }
 for(const [kind,rows] of groups)out.cases.push({level,kind,rows});
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`${out.checked} native OAM rows; ${out.cases.reduce((n,c)=>n+c.rows.length,0)} retained`);

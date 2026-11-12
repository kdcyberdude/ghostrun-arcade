/** Native OAM on enemy contact/conversion frames, before the new state reaches the picture.
 * node tools/harness/native-contact-pictures.mjs --traces DIR [--out tests/fixtures/native-contact-pictures.json]
 * Captures normal live walkers converted to shells, unwinged or killed this row, with fully visible six-sprite OAM.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-contact-pictures.json'}}});
if(!a.traces)throw Error('--traces is required');
const kinds={0:'koopa',1:'redKoopa',2:'beetle',3:'redKoopa',4:'koopa',6:'goomba',14:'paratroopa',15:'paratroopa',16:'paratroopa'};
const out={source:'Native v2 RAM before/after contact and OAM of the same row: normal EnemyGfxHandler precedes BG/enemy/player contacts and movement',events:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file);
 for(let f=1;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),p=d.subarray((f-1)*2048,f*2048);
  if(r[14]!==8||r[0x747]!==0||r[0x770]!==1)continue;
  for(let s=0;s<5;s++){
   const id=p[22+s],kind=kinds[id];if(!kind||r[15+s]!==1||p[15+s]!==1||p[30+s]>1)continue;
   if(r[22+s]===id&&(r[30+s]&0x24)===(p[30+s]&0x24))continue;
   const o=0x200+r[0x6e5+s];if(r[o+3]>239||Array.from({length:6},(_,k)=>r[o+k*4]).some(y=>y>=240))continue;
   out.events.push({level,frame:f,counter:r[9],before:{kind,x:p[0x6e+s]*256+p[0x87+s],y:p[0xcf+s]+24,vx:p[0x46+s]===2?-0.5:0.5},after:{kind:kinds[r[22+s]]??kind,dead:((r[30+s]&0x20)!==0||kind==='goomba'&&r[30+s]>=2)?1:0,shell:r[22+s]<5&&r[30+s]>=2},camera:r[0x71a]*256+r[0x71c],oamX:r[o+3],oamY:r[o+8],tiles:Array.from({length:6},(_,k)=>r[o+k*4+1])});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`${out.events.length} native contact pictures`);

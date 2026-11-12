/** Native Blooper/Lakitu graphics from their timer state at EnemyGfxHandler, not enemy age.
 * node tools/harness/native-special-enemy-pictures.mjs --traces DIR [--out tests/fixtures/native-special-enemy-pictures.json]
 * Blooper interval timer $0796+s; Lakitu FrenzyEnemyTimer $078F at its slot turn, before a higher-slot egg can restart it.
 * Native source: CheckForLakitu, CheckForBloober, CheckAnimationStop in https://github.com/Xkeeper0/smb1/blob/master/src/prg.asm.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-special-enemy-pictures.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={source:'Native v2 RAM/OAM, tuples [frame,counter,graphicsTimer,tile0..tile5,priorX,priorFeetY,camera,oamX,oamMiddleY]',checked:0,cases:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file),groups=new Map(),prior=new Map();
 for(let f=1;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),p=d.subarray((f-1)*2048,f*2048);
  if(r[14]!==8||r[0x747]!==0||r[0x770]!==1)continue;
  for(let s=0;s<5;s++){
   const id=r[22+s];if(![7,17].includes(id)||r[15+s]!==1||p[15+s]!==1||p[22+s]!==id||(p[30+s]&0x20))continue;
   const o=0x200+r[0x6e5+s];if(r[o+3]>239||Array.from({length:6},(_,k)=>r[o+k*4]).some(y=>y>=240))continue;
   let timer=r[0x796+s];
   if(id===17){
    timer=Math.max(0,p[0x78f]-1);
    if(r[0x78f]>timer&&Array.from({length:s},(_,k)=>k).some(k=>r[15+k]&&r[22+k]===18&&(!p[15+k]||p[22+k]!==18)))timer=r[0x78f];
   }
   const kind=id===7?'blooper':'lakitu',tiles=Array.from({length:6},(_,k)=>r[o+k*4+1]),key=JSON.stringify([timer,...tiles]);out.checked++;
   if(key!==prior.get(s)||f%8===0){
    if(!groups.has(kind))groups.set(kind,[]);
    groups.get(kind).push([f,r[9],timer,...tiles,p[0x6e+s]*256+p[0x87+s],p[0xcf+s]+24,r[0x71a]*256+r[0x71c],r[o+3],r[o+8]]);
   }prior.set(s,key);
  }
 }
 for(const [kind,rows]of groups)out.cases.push({level,kind,rows});
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`${out.checked} native special-enemy pictures`);

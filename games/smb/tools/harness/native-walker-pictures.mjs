/** Stable normal walker pictures, independently read from native OAM. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-walker-pictures.json'}}});if(!a.traces)throw Error('--traces is required');
const out={source:'Native stable ID0/1/2/14/15/16 normal walkers: full sprite XY, CHR, attributes and native MovingDir; tuples level,frame,id,counter,direction,pre-handler x/feetY,camera,six [CHR,x,y,attributes] sprites',checked:0,rows:[]},seen=new Set();
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const data=fs.readFileSync(file);
 for(let frame=1;frame<data.length/2048;frame++){
  const r=data.subarray(frame*2048,(frame+1)*2048),p=data.subarray((frame-1)*2048,frame*2048);if(r[0x770]!==1||r[14]!==8||r[0x747])continue;
  for(let s=0;s<5;s++){
   const id=r[22+s];if(![0,1,2,14,15,16].includes(id)||r[15+s]!==1||p[15+s]!==1||p[22+s]!==id||r[30+s]>1||p[30+s]>1||r[0x796+s]||r[0x46+s]!==p[0x46+s])continue;
   const o=0x200+r[0x6e5+s],sprites=Array.from({length:6},(_,k)=>[r[o+k*4+1],r[o+k*4+3],r[o+k*4],r[o+k*4+2]]);if(sprites.some(t=>t[1]>232||t[2]<32||t[2]>=232))continue;
   out.checked++;const key=JSON.stringify([id,r[9]&8,r[0x46+s],r[0x74e],sprites.map(t=>[t[0],t[3]])]);if(seen.has(key))continue;seen.add(key);out.rows.push([level,frame,id,r[9],r[0x46+s],p[0x6e+s]*256+p[0x87+s],p[0xcf+s]+24,r[0x71a]*256+r[0x71c],...sprites.flat()]);
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(out.checked,'native walker pictures;',out.rows.length,'distinct cases');

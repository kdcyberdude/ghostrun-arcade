/** Native ID8/51 OAM: --traces DIR [--out FILE]. No per-level picture rules. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-bullet-pictures.json'}}});if(!a.traces)throw Error('--traces required');const out={source:'Native ID8 uses prior handler position/direction/state; ID51 uses current handler position/direction/frame timer. Four opaque body pieces; blank top OAM row may be replaced by a floatey number.',checked:0,rows:[]},seen=new Set();
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const d=fs.readFileSync(file);
 for(let frame=1;frame<d.length/2048;frame++){const r=d.subarray(frame*2048,(frame+1)*2048),p=d.subarray((frame-1)*2048,frame*2048);if(r[0x770]!==1||r[0x772]!==3||![8,9,10,11].includes(r[14]))continue;
  for(let slot=0;slot<5;slot++){const id=r[22+slot];if(![8,51].includes(id)||r[15+slot]!==1||p[15+slot]!==1||p[22+slot]!==id)continue;const before=id===8?p:r,o=0x200+r[0x6e5+slot],sprites=Array.from({length:6},(_,k)=>[r[o+k*4+1],r[o+k*4+3],r[o+k*4]+1,r[o+k*4+2]]);if(sprites.some(t=>t[1]>232||t[2]<32||t[2]>=232))continue;
   out.checked++;const state=before[0x1e+slot],direction=before[0x46+slot],timer=r[0x78a+slot],key=JSON.stringify([id,state,direction,Boolean(timer),sprites.map(t=>[t[0],t[3]])]);if(seen.has(key))continue;seen.add(key);out.rows.push({level,frame,id,state,direction,timer,x:before[0x6e+slot]*256+before[0x87+slot],feetY:before[0xcf+slot]+24,camera:r[0x71a]*256+r[0x71c],sprites:sprites.filter(t=>t[0]!==252&&(t[3]&3)===3)});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(out.checked,'native Bullet pictures;',out.rows.length,'distinct cases');

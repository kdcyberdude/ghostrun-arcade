/** Native DrawHammer/JCoinGfxHandler OAM from misc states and FrameCounter, including byte coordinate wrapping.
 * node tools/harness/native-misc-pictures.mjs --traces DIR [--out tests/fixtures/native-misc-pictures.json]
 * Captures every fully visible native misc sprite pair; keep each pose change and every16th row.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-misc-pictures.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={source:'Native v2 RAM: Misc_State $2A+s, world position $7A/$93/$C2/$DB+s, FrameCounter $09 and two OAM sprites selected by Misc_SprDataOffset $06F3+s',checked:0,events:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file),prior=new Map();
 for(let f=0;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),p=f?d.subarray((f-1)*2048,f*2048):r;// Misc slots run9→0. A new hammer collision can set TimerControl after higher slots already drew.
  let hurtSlot=-1;if(!p[0x747]&&r[0x747]&&!r[0x79f])for(let s=0;s<9;s++)if(r[0x2a+s]>=0x80&&!p[0x6be+s]&&r[0x6be+s])hurtSlot=s;if(![8,9,10,11].includes(r[14])||r[0x772]!==3||r[0x770]!==1)continue;
  for(let s=0;s<9;s++){
   const state=r[0x2a+s];if(!state||state>=48&&state<0x81)continue;
   const o=0x200+r[0x6f3+s];if([r[o],r[o+4],r[o+3],r[o+7]].some(v=>v>=240))continue;
   const sprites=[0,1].map(k=>({tile:r[o+4*k+1],x:r[o+4*k+3],y:r[o+4*k]+1,flipX:Boolean(r[o+4*k+2]&64),flipY:Boolean(r[o+4*k+2]&128)})),key=JSON.stringify([state,...sprites.flatMap(p=>[p.tile,p.flipX,p.flipY])]);out.checked++;
   if(key!==prior.get(s)||f%16===0)out.events.push({level,frame:f,counter:r[9],slot:s,timerControl:r[0x747],hurtSlot,timersStopped:Boolean(r[0x747])&&!(hurtSlot>=0&&s>hurtSlot),kind:state>=0x80?'hammer':'coin',state,x:r[0x7a+s]*256+r[0x93+s],y:(r[0xc2+s]-1)*256+r[0xdb+s],camera:r[0x71a]*256+r[0x71c],sprites});prior.set(s,key);
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`${out.checked} native misc sprite pairs`);

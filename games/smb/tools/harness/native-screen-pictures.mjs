/** Pair source screen/disable state with the actual following PPU picture.
 * Pixel arrays are the native 240x224 crop at NES (8,8); the field starts at y32. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-screen-pictures.json'}}});if(!a.traces)throw Error('--traces is required');
const out={source:'Native every-frame RAM $0772/$0e/$073c/$0774 paired with pixels.bin at frame+1; 240x224 crop field y32..231. This retains actual PPU colors, not inferred screen geometry.',checked:0,events:[],messages:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const dir=path.join(a.traces,level);if(!fs.existsSync(path.join(dir,'pixels.bin')))continue;const meta=JSON.parse(fs.readFileSync(path.join(dir,'pixels.json')));if(meta.step!==1)throw Error('Every-frame native pixels are required');
 const ram=fs.readFileSync(path.join(dir,'ram.bin')),pixels=fs.readFileSync(path.join(dir,'pixels.bin'));let prior,priorMessage;
 for(let f=0;f<Math.min(ram.length/2048,meta.frames)-1;f++){
  const r=ram.subarray(f*2048,(f+1)*2048);if(r[0x770]!==1||r[0x772]>2)continue;
  const n={task:r[0x772],engine:r[14],screen:r[0x73c],disable:r[0x774]},p=pixels.subarray((f+1)*240*224,(f+2)*240*224),field=p.subarray(240*24),colors=[...new Set(field)],water=r[0x74e]===0;
  if(n.task===1&&n.disable===0&&[5,6,7,8].includes(n.screen)){
   const count=(x,y,w,h)=>{let total=0;for(let j=y-8;j<y-8+h;j++)for(let i=x-8;i<x-8+w;i++)if(p[j*240+i]!==15)total++;return total;};
   const avatar=count(96,89,16,32),lives=count(88,80,80,8),timeUp=count(96,128,56,8),key=JSON.stringify([n,avatar,lives,timeUp]);
   if(key!==priorMessage){out.messages.push({level,frame:f,n,water,avatar,lives,timeUp});priorMessage=key;}
  }
  // ScreenRoutines can be interrupted before a complete CPU pass. Retain
  // uniform PPU pictures as direct universal-color evidence for the writer.
  if(colors.length!==1)continue;
  const key=JSON.stringify([n,water,colors[0]]);out.checked++;if(prior===key)continue;prior=key;out.events.push({level,frame:f,n,water,areaType:r[0x74e],background:r[0x744],previous:pixels[f*240*224],color:colors[0]});
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(out.checked,out.events.length);

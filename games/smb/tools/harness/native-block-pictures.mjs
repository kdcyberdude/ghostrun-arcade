/** Native DrawBlock OAM fixture; only fully visible, bouncing four-sprite blocks. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-block-pictures.json'}}});if(!a.traces)throw Error('--traces is required');
const data={source:'Native DrawBlock: Block_SprDataOffset $06ec+s, Block_PageLoc/X/Y $76/$8f/$d7+s, Block_Metatile $03e8+s, AreaType $074e, four OAM pieces',checked:0,events:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const raw=fs.readFileSync(file);
 for(let f=1;f<raw.length/2048;f++){
  const r=raw.subarray(f*2048,(f+1)*2048),b=raw.subarray((f-1)*2048,f*2048);if(r[0x770]!==1||r[0x772]!==3)continue;
  for(let slot=0;slot<2;slot++){
   if((r[0x26+slot]&15)!==1&&(b[0x26+slot]&15)!==1)continue;const o=0x200+r[0x6ec+slot];
   if([0,4,8,12].some(k=>r[o+k]>=240||r[o+k+3]>=248))continue;
   const sprites=[0,4,8,12].map(k=>({tile:r[o+k+1],x:r[o+k+3],y:r[o+k]+1,palette:r[o+k+2]&3,flipX:Boolean(r[o+k+2]&64),flipY:Boolean(r[o+k+2]&128)}));
   if(!sprites.every(p=>[0x85,0x86,0x87].includes(p.tile)))continue;
   data.checked++;data.events.push({level,frame:f,x:r[0x76+slot]*256+r[0x8f+slot],pictureY:r[0xd7+slot],metatile:r[0x3e8+slot],ground:r[0x74e]===1,camera:r[0x71a]*256+r[0x71c],sprites});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(data)+'\n');console.log(data.checked);

/** Capture native DrawBubble OAM and offscreen decisions from v2 RAM. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-bubble-pictures.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={source:'Native DrawBubble: Player_Y_HighPos $b5, Bubble_SprDataOffset $06ee+s, OAM CHR $74 attribute2; bubble world $83/$9c+s, raw Y $e4+s',checked:0,events:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const data=fs.readFileSync(file);
 for(let frame=0;frame<data.length/2048;frame++){
  const r=data.subarray(frame*2048,(frame+1)*2048);if(r[14]!==8||r[0x747]||r[0x770]!==1||r[0x74e]!==0)continue;
  for(let slot=0;slot<3;slot++){
   const o=0x200+r[0x6ee+slot],y=r[0xe4+slot],x=r[0x83+slot]*256+r[0x9c+slot],camera=r[0x71a]*256+r[0x71c];
   // Hidden OAM rows carry stale CHR/attribute bytes. Retain the actual visible ring only.
   if(y>=240||r[o]>=240||r[o+1]!==0x74||r[o+2]!==2)continue;
   out.checked++;if(frame%16===0)out.events.push({level,frame,x,y,playerFeetY:(r[0xb5]-1)*256+r[0xce]+32,camera,sprite:{x:r[o+3],y:r[o]+1}});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`${out.checked} native bubble sprites`);

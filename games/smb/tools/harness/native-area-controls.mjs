/** Extract AreaParser row-$0d control objects from the supplied PRG0 ROM. Runtime uses only generated metadata.
 * node tools/harness/native-area-controls.mjs --rom FILE --traces DIR --output data/native-area-controls.json */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {createHash} from 'node:crypto';
const {values:a}=parseArgs({options:{rom:{type:'string'},traces:{type:'string'},output:{type:'string'}}});if(!a.rom||!a.traces||!a.output)throw Error('--rom, --traces, --output required');
const rom=fs.readFileSync(a.rom),levels=JSON.parse(fs.readFileSync('data/levels.json','utf8')),streams={},bindings={};
for(const level of levels.filter(l=>l.id.endsWith('-4'))){
 const ram=fs.readFileSync(path.join(a.traces,level.id,'initial.ram')),ptr=ram[0xe7]+ram[0xe8]*256,key=ptr.toString(16);
 if(!streams[key]){
  const objects=[];let page=0,offset=0;
  while(rom[16+ptr-0x8000+offset]!==253){
   const first=rom[16+ptr-0x8000+offset],second=rom[16+ptr-0x8000+offset+1];if(second&128)page++;
   if((first&15)===13){if(second&64)objects.push({column:page*16+(first>>4),command:second&63,offset});else page=second&31;}
   offset+=2;if(offset>1024)throw Error('Unterminated area stream');
  }
  streams[key]={objects};
 }
 const axe=streams[key].objects.filter(o=>o.command===2).at(-1);if(!axe)throw Error('Castle stream has no axe');
 for(const area of level.areas)if(area.exit?.kind==='axe')bindings[`${level.id}/${area.id}`]={stream:key,origin:axe.column-Math.floor(area.exit.x/16)};
}
fs.writeFileSync(a.output,JSON.stringify({method:'ProcessAreaData/DecodeAreaData row13; Native AreaData pointer from entrance RAM; coordinate origin aligns the same ROM axe object with its compiled tile. No frame/camera fits.',romSha256:createHash('sha256').update(rom).digest('hex'),streams,bindings},null,1)+'\n');

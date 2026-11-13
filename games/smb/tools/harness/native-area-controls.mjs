/** Extract AreaParser row-$0d control objects from the supplied PRG0 ROM. Runtime uses only generated metadata.
 * node tools/harness/native-area-controls.mjs --rom FILE --traces DIR --output data/native-area-controls.json */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {createHash} from 'node:crypto';
const {values:a}=parseArgs({options:{rom:{type:'string'},traces:{type:'string'},output:{type:'string'}}});if(!a.rom||!a.traces||!a.output)throw Error('--rom, --traces, --output required');
const rom=fs.readFileSync(a.rom),levels=JSON.parse(fs.readFileSync('data/levels.json','utf8')),previous=JSON.parse(fs.readFileSync(a.output,'utf8')),streams={},bindings={};
function readStream(ptr){
 const key=ptr.toString(16);
 if(!streams[key]){
  const objects=[];let page=0,offset=0;
  while(rom[16+ptr-0x8000+offset]!==253){
   const first=rom[16+ptr-0x8000+offset],second=rom[16+ptr-0x8000+offset+1];if(second&128)page++;
   if((first&15)===13){if(second&64)objects.push({column:page*16+(first>>4),command:second&63,offset});else page=second&31;}
   offset+=2;if(offset>1024)throw Error('Unterminated area stream');
  }
  streams[key]={objects};
 }
 return key;
}
for(const area of previous.areas??[]){const source=area.source[0];if(source)bindings[`${area.level}/${area.area}`]={stream:readStream(source.pointer),origin:-source.offset};}
for(const level of levels.filter(l=>l.id.endsWith('-4'))){
 const ram=fs.readFileSync(path.join(a.traces,level.id,'initial.ram')),ptr=ram[0xe7]+ram[0xe8]*256,key=readStream(ptr);
 const axe=streams[key].objects.filter(o=>o.command===2).at(-1);if(!axe)throw Error('Castle stream has no axe');
 for(const area of level.areas)if(area.exit?.kind==='axe')bindings[`${level.id}/${area.id}`]={stream:key,origin:axe.column-Math.floor(area.exit.x/16)};
}
fs.writeFileSync(a.output,JSON.stringify({...previous,method:'ProcessAreaData/DecodeAreaData row13; Area pointers/origins from native block-buffer geometry bindings, with castle axe alignment from entrance RAM. No frame/camera fits.',romSha256:createHash('sha256').update(rom).digest('hex'),streams,bindings},null,2)+'\n');

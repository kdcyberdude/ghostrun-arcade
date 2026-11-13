/** Extract the physical ProcessEnemyData records used by the shared loader. */
import fs from 'node:fs';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{rom:{type:'string'},catalog:{type:'string',default:'data/native-area-catalog.json'},out:{type:'string',default:'data/native-enemy-streams.json'}}});if(!a.rom)throw Error('--rom required');
const rom=fs.readFileSync(a.rom),catalog=JSON.parse(fs.readFileSync(a.catalog,'utf8')),sha256=createHash('sha256').update(rom).digest('hex');if(sha256!==catalog.source.sha256)throw Error('Reference ROM does not match the native area catalog');
const streams=[];
for(const pointer of [...new Set(Object.values(catalog.areas).map(a=>a.enemy))]){
 const base=16+pointer-0x8000;let end=0;
 while(rom[base+end]!==255)end+=(rom[base+end]&15)===14?3:2;
 streams.push({pointer,bytes:Array.from(rom.subarray(base,base+end+1))});
}
fs.writeFileSync(a.out,JSON.stringify({source:{sha256,method:'PRG0 physical ProcessEnemyData records through the first row-FF terminator; shared area catalog pointers'},streams})+'\n');console.log(streams.length,'physical enemy streams');

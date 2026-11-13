/** Extract RowOfCoins metadata for native water streams. No observed cell or level fits.
 * node tools/harness/native-water-coins.mjs --rom FILE --out data/native-water-coins.json */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{rom:{type:'string'},out:{type:'string',default:'data/native-water-coins.json'}}});
if(!a.rom)throw Error('--rom required');
const rom=fs.readFileSync(a.rom),catalog=JSON.parse(fs.readFileSync('data/native-area-catalog.json','utf8')),sha256=createHash('sha256').update(rom).digest('hex');
if(sha256!==catalog.source.sha256)throw Error('Expected native catalog reference ROM');
const streams={};
for(const area of Object.values(catalog.areas).filter(a=>a.type===0)){
 const coins=[];let page=0;
 // GetAreaDataAddrs stores stream+2: the catalog data pointer already skips its two-byte header.
 for(let offset=0;offset<1024;offset+=2){
  const address=16+area.data-0x8000+offset,first=rom[address],second=rom[address+1],row=first&15;
  if(first===253){streams[area.data]={coins};break;}
  if(second&128)page++;
  if(row===13&&!(second&64)){page=second&31;continue;}
  if(row<12&&(second&112)===64)coins.push({offset,column:page*16+(first>>4),row:row+2,length:(second&15)+1,id:195});
  if(offset===1022)throw Error('Unterminated native area stream');
 }
}
fs.writeFileSync(a.out,JSON.stringify({schema:'native-water-coins-v1',source:{sha256,method:'DecodeAreaData large object4 -> RowOfCoins/GetRow; AreaType0 CoinMetatileData=$c3; GetLrgObjAttrib low nibble row/length; block-buffer row0 is map row2. Data pointers already skip headers.'},streams},null,1)+'\n');

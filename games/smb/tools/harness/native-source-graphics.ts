/** Derive timing inputs from the existing indexed graphics sheet. No ROM image is
 * emitted. Optional --rom authenticates the derived bytes against a local ROM.
 * npx tsx tools/harness/native-source-graphics.ts [--rom ROM] */
import fs from 'node:fs';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import {PNG} from 'pngjs';
const {values}=parseArgs({options:{rom:{type:'string'},out:{type:'string',default:'data/native-source-ppu-graphics.json'}}});
const path='assets/graphics/patterns-index.png',file=fs.readFileSync(path),png=PNG.sync.read(file);
if(png.width!==128||png.height!==256)throw Error('Expected indexed 512-pattern sheet');
const opacity:number[]=[],title:number[]=[],chr=new Uint8Array(8192);
for(let tile=0;tile<512;tile++)for(let y=0;y<8;y++){
 let low=0,high=0;for(let x=0;x<8;x++){const offset=(((tile>>4)*8+y)*128+(tile&15)*8+x)*4,value=png.data[offset];if(value>3||png.data[offset+1]!==value||png.data[offset+2]!==value)throw Error('Expected 2-bit pattern indices');low|=(value&1)<<(7-x);high|=(value>>1)<<(7-x);}
 chr[tile*16+y]=low;chr[tile*16+y+8]=high;opacity.push(low|high);
}
// DrawTitleScreen reads the source TitleScreenDataOffset $1ec0 command stream.
// Preserve its complete source region through the end of pattern memory.
for(let address=0x1ec0;address<0x2000;address++)title.push(chr[address]);
if(values.rom){const rom=fs.readFileSync(values.rom),offset=16+rom[4]*16384;if(!rom.subarray(offset,offset+8192).equals(chr))throw Error('Indexed graphics differ from local source CHR');}
fs.writeFileSync(values.out!,JSON.stringify({scope:'Source PPU timing opacity and static DrawTitleScreen readback; derived from existing graphics, no recorded RAM.',source:{path,sha256:createHash('sha256').update(file).digest('hex')},opacity,titleAddress:0x1ec0,title})+'\n');
console.log(`SOURCE_GRAPHICS_PASS ${opacity.length} opacity rows, ${title.length} title bytes`);

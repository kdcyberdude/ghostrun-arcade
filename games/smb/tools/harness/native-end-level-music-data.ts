/** Extract the source EndOfLevelMusHdr/WinLevelMusData and length table.
 * npx tsx tools/harness/native-end-level-music-data.ts --rom FILE [--out FILE]
 * Addresses are PRG0 source labels; no recording durations enter this data. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import controls from '../../data/native-area-controls.json';
const {values:a}=parseArgs({options:{rom:{type:'string'},out:{type:'string',default:'data/native-end-level-music.json'}}});
if(!a.rom)throw Error('--rom required');
const rom=fs.readFileSync(a.rom),romSha256=createHash('sha256').update(rom).digest('hex');
if(romSha256!==controls.romSha256)throw Error('Expected authenticated PRG0 ROM');
const byte=(address:number)=>rom[16+address-0x8000],header=Array.from({length:5},(_,i)=>byte(0xf949+i));
if(header[0]!==32||header[1]+header[2]*256!==0xfcb0)throw Error('Source header differs');
const notes=[];for(let offset=0;offset<256;offset++){const b=byte(0xfcb0+offset);notes.push(b);if(b===0)break;}
if(notes.at(-1)!==0)throw Error('Missing EndOfMusicData terminator');
fs.writeFileSync(a.out!,JSON.stringify({romSha256,source:'PRG0 SoundEngine/MusicHandler: EndOfLevelMusHdr $F949, WinLevelMusData $FCB0, MusicLengthLookupTbl $FF66. Square2 $00 terminates event $20; negative bytes select low-three-bit note lengths.',headerAddress:0xf949,dataAddress:0xfcb0,lengthTableAddress:0xff66,header,notes,lengths:Array.from({length:8},(_,i)=>byte(0xff66+header[0]+i))},null,2)+'\n');

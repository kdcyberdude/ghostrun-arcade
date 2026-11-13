/** Preserve all slot5 ID23 NoRun rows, including birth and erase lifetime. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {decodeEntrance} from './native-entrance.mjs';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},out:{type:'string',default:'tests/fixtures/native-special-controller.json'}}});if(!a.traces||!a.entrances)throw Error('--traces and --entrances required');
const level='7-2',directory=path.join(a.traces,level),ram=fs.readFileSync(path.join(directory,'ram.bin')),pads=fs.readFileSync(path.join(directory,'pads.bin')),entrance=decodeEntrance(fs.readFileSync(path.join(directory,'initial.ram')),JSON.parse(fs.readFileSync(path.join(a.entrances,level,'entrance.json'),'utf8'))),rows=[];
for(let frame=0;frame<pads.length;frame++){const r=ram.subarray(frame*2048,(frame+1)*2048);rows.push(r[0x14]&&r[0x1b]===23?[r[0x73]*256+r[0x8c],r[0xbb],r[0xd4],r[0x23]]:null);}
fs.writeFileSync(a.out,JSON.stringify({source:'Unmodified original v2 PPU RAM; slot5 NoRun retains YHigh independently of YLow',level,entrance,pads:Array.from(pads),rows})+'\n');console.log(rows.filter(Boolean).length);

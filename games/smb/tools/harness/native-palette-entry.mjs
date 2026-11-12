/** Retain the first full FrameCounter period after a native death/engine7 entrance. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {decodeEntrance} from './native-entrance.mjs';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},level:{type:'string'},out:{type:'string',default:'tests/fixtures/native-palette-entry.json'}}});if(!a.traces||!a.entrances||!a.level)throw Error('--traces, --entrances and --level are required');
const dir=path.join(a.traces,a.level),raw=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));let dead=false,first=-1;
for(let f=0;f<raw.length/2048;f++){const r=raw.subarray(f*2048,(f+1)*2048);if(r[14]===11)dead=true;if(dead&&r[14]===7){first=f;break;}}
if(first<0)throw Error('No native death/engine7 entry');const end=Math.min(first+256,pads.length),rows=[];
for(let f=first;f<end;f++){const r=raw.subarray(f*2048,(f+1)*2048);if(r[14]===7||r[14]===8)rows.push([f,r[9],r[0x6d4]]);}
const entrance=decodeEntrance(fs.readFileSync(path.join(dir,'initial.ram')),JSON.parse(fs.readFileSync(path.join(a.entrances,a.level,'entrance.json'),'utf8')));
fs.writeFileSync(a.out,JSON.stringify({source:'Native first engine7 after death: one full $09 period; rows [frame,FrameCounter,ColorRotateOffset]',level:a.level,entrance,pads:[...pads.subarray(0,end)],rows})+'\n');

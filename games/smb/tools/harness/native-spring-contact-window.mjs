/** Retain native Mario/Spring contact rows with the complete preceding input replay. */
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:Object.fromEntries(['traces','entrances','level','from','to','out'].map(key=>[key,{type:'string'}]))});
for(const key of ['traces','entrances','level','from','to','out'])if(a[key]===undefined)throw Error(`--${key} required`);
const dir=path.join(a.traces,a.level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),pack=b=>gzipSync(b).toString('base64');
const rows=[];
for(let frame=Number(a.from);frame<=Number(a.to);frame++){
 const r=ram.subarray(frame*2048,(frame+1)*2048);
 rows.push({frame,x:r[0x6d]*256+r[0x86]+r[0x400]/256,y:(r[0xb5]-1)*256+r[0xce]+32+r[0x416]/256,camera:r[0x71a]*256+r[0x71c],control:r[0x70e]});
}
fs.writeFileSync(a.out,JSON.stringify({level:a.level,receipt:JSON.parse(fs.readFileSync(path.join(a.entrances,a.level,'entrance.json'),'utf8')),initialRam:pack(fs.readFileSync(path.join(dir,'initial.ram'))),pads:pack(pads.subarray(0,Number(a.to)+1)),rows})+'\n');

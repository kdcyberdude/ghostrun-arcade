/** Retain a native cannon table/slot replay window, including its independent initial RAM and prior actions.
 * node tools/harness/native-cannon-window.mjs --traces DIR --entrances DIR --level 8-2 --from 1148 --to 1184 --out FILE */
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:Object.fromEntries(['traces','entrances','level','from','to','out'].map(key=>[key,{type:'string'}]))});
for(const key of ['traces','entrances','level','from','to','out'])if(a[key]===undefined)throw Error(`--${key} required`);
const dir=path.join(a.traces,a.level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const pack=b=>gzipSync(b).toString('base64');
const rows=[];
for(let frame=Number(a.from);frame<=Number(a.to);frame++){
 const r=ram.subarray(frame*2048,(frame+1)*2048);
 const cannons=[0,1,2].filter(slot=>r[15+slot]===1&&r[22+slot]===51).map(slot=>({slot,x:r[110+slot]*256+r[135+slot]+r[1025+slot]/256,y:r[182+slot]*256+r[207+slot]-256+24}));
 rows.push({frame,offset:r[0x46a],counter:r[9],task:r[0x71f],column:r[0x725]*16+r[0x726],table:[0,1,2,3,4,5].map(k=>({x:r[0x46b+k]*256+r[0x471+k],y:r[0x477+k],timer:r[0x47d+k]})),cannons,slotSub:Array.from(r.subarray(0x401,0x406))});
}
fs.writeFileSync(a.out,JSON.stringify({level:a.level,receipt:JSON.parse(fs.readFileSync(path.join(a.entrances,a.level,'entrance.json'),'utf8')),initialRam:pack(fs.readFileSync(path.join(dir,'initial.ram'))),pads:pack(pads.subarray(0,Number(a.to)+1)),rows})+'\n');
console.log(`${rows.length} Cannon table replay rows retained`);

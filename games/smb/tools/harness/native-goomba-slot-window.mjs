/** Retain a native Goomba corpse-slot replay window, including its independent initial RAM and prior actions.
 * node tools/harness/native-goomba-slot-window.mjs --traces DIR --entrances DIR --level 2-1 --from 523 --to 531 --out FILE */
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:Object.fromEntries(['traces','entrances','level','from','to','out'].map(key=>[key,{type:'string'}]))});
for(const key of ['traces','entrances','level','from','to','out'])if(a[key]===undefined)throw Error(`--${key} required`);
const dir=path.join(a.traces,a.level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const signed=v=>v<128?v:v-256,pack=b=>gzipSync(b).toString('base64');
const rows=[];
for(let frame=Number(a.from);frame<=Number(a.to);frame++){
 const r=ram.subarray(frame*2048,(frame+1)*2048),actors=[];
 for(let slot=0;slot<5;slot++)if(r[15+slot]===1&&r[22+slot]===6)actors.push({slot,id:r[22+slot],state:r[30+slot],timer:r[1942+slot],vx:signed(r[88+slot])/16,x:r[110+slot]*256+r[135+slot]+r[1025+slot]/256,y:r[182+slot]*256+r[207+slot]-256+24,speed:signed(r[160+slot]),force:r[1076+slot],fraction:r[1047+slot]});
 rows.push({frame,actors});
}
fs.writeFileSync(a.out,JSON.stringify({level:a.level,receipt:JSON.parse(fs.readFileSync(path.join(a.entrances,a.level,'entrance.json'),'utf8')),initialRam:pack(fs.readFileSync(path.join(dir,'initial.ram'))),pads:pack(pads.subarray(0,Number(a.to)+1)),rows})+'\n');
console.log(`${rows.length} Goomba slot replay rows retained`);

/** Compact native water entrance RAM and following rows for snapshot adapter tests.
 * node tools/harness/native-water-seed-cases.mjs --traces DIR [--out FILE] */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-water-seed-cases.json'}}});
if(!a.traces)throw Error('--traces required');
const cases=[];
for(const [level,area,row]of [['2-2','area-2',352],['2-2','area-2',353],['2-2','area-2',386],['7-2','area-4',352],['7-2','area-4',3112],['7-2','area-4',3113]]){
 const dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
 const expected=[];
 for(let f=row+1;f<=row+200;f++){
  const r=ram.subarray(f*2048,(f+1)*2048);
  expected.push([r[0x6d]*256+r[0x86],r[0xce],r[0x71a]*256+r[0x71c],r[0x9f],r[0x433],r[0x416],r[0x792],[0,1,2].map(s=>[r[0x83+s]*256+r[0x9c+s],r[0xe4+s],r[0xcb+s],r[0x42c+s]])]);
 }
 cases.push({level,area,row,initial:zlib.gzipSync(ram.subarray(row*2048,(row+1)*2048)).toString('base64'),pads:Array.from(pads.subarray(row+1,row+201)),expected});
}
fs.writeFileSync(a.out,JSON.stringify(cases)+'\n');console.log(cases.map(c=>`${c.level} row${c.row}: ${c.pads.length}`));

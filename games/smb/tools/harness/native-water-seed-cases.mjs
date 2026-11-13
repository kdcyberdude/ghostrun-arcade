/** Compact native water entrance RAM and following rows for snapshot adapter tests.
 * node tools/harness/native-water-seed-cases.mjs --traces DIR [--moods DIR --out FILE] */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},moods:{type:'string'},out:{type:'string',default:'tests/fixtures/native-water-seed-cases.json'}}});
if(!a.traces)throw Error('--traces required');
const cases=[];
const requests=[['2-2','area-2',352],['2-2','area-2',353],['2-2','area-2',386],['7-2','area-4',352],['7-2','area-4',3112],['7-2','area-4',3113],['7-2','area-4',1488,undefined,1000]];
if(a.moods)for(const row of [25320,26560])requests.push(['2-2','area-2',row,'d2bbd82bb5182db3aaf5c777b720352ef7b60d97f052d06100a3817277595132',300]);
if(a.moods)requests.push(['2-2','area-2',18032,'d2bbd82bb5182db3aaf5c777b720352ef7b60d97f052d06100a3817277595132',1100]);
if(a.moods)requests.push(['2-2','area-2',19888,'9c64d0397bb9660b2e0729f8fd64ed0bfe0fa432b828dfd337cd7fa93a0d5d1f',1600]);
for(const [level,area,row,source,count=200]of requests){
 const dir=source?path.join(a.moods,'captures',source):path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
 const expected=[];
 for(let f=row+1;f<=row+count;f++){
  const r=ram.subarray(f*2048,(f+1)*2048);
  expected.push([r[0x6d]*256+r[0x86],r[0xce],r[0x71a]*256+r[0x71c],r[0x9f],r[0x433],r[0x416],(r[0x57]<128?r[0x57]:r[0x57]-256)*256+r[0x705],r[0x792],[0,1,2].map(s=>[r[0x83+s]*256+r[0x9c+s],r[0xe4+s],r[0xcb+s],r[0x42c+s]]),[0,1,2,3,4].filter(s=>r[15+s]&&[7,10,11].includes(r[22+s])).map(s=>[s,r[22+s],r[0x6e+s]*256+r[0x87+s],r[0xcf+s]]),[r[0x739],r[0x73a],r[0x73b]],[0,1,2,3,4,5].filter(s=>r[15+s]&&r[22+s]===23).map(s=>[s,r[0x6e+s]*256+r[0x87+s],r[0xcf+s]])]);
 }
 cases.push({level,area,row,...(source?{source}:{}),initial:zlib.gzipSync(ram.subarray(row*2048,(row+1)*2048)).toString('base64'),pads:Array.from(pads.subarray(row+1,row+count+1)),expected});
}
fs.writeFileSync(a.out,JSON.stringify(cases)+'\n');console.log(cases.map(c=>`${c.level} row${c.row}: ${c.pads.length}`));

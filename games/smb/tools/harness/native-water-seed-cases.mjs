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
if(a.moods)requests.push(['2-2','area-2',24060,'d2bbd82bb5182db3aaf5c777b720352ef7b60d97f052d06100a3817277595132',200]);
if(a.moods)requests.push(['2-2','area-2',19888,'9c64d0397bb9660b2e0729f8fd64ed0bfe0fa432b828dfd337cd7fa93a0d5d1f',2200]);
if(a.moods)requests.push(['2-2','area-2',14237,'169e3e3b117d67c5cefbc75d62fcd751b57c8fc7f673733f524fc0a481f77ebb',500]);
if(a.moods)requests.push(['2-2','area-2',13849,'a9aa051457bcc42654c58c64413674af0866dea081ef145bedcc3254efe690ef',1500]);
if(a.moods)requests.push(['2-2','area-2',21184,'d6214d967b1d8be14367512a61736e436fc869ee9b39e1ff450e049afe24b863',2400]);
if(a.moods)requests.push(['2-2','area-2',24519,'0a766fa4fee6a522569ef5c7fb56a7d73d3b4a863a742c0318bc1d21a833da17',2200]);
if(a.moods)requests.push(['2-2','area-2',12955,'720e40f3d36d348dca5e5eb13a318bd18a222d81295ef846d2cb754c88c8e09a',700],['2-2','area-2',21078,'4403137e51c7d90ddea79c4b106e5646509cc5d9bb6ba83d7f8e01fad1fa1c9d',700]);
if(a.moods)requests.push(['2-2','area-2',15371,'01f49b100bcaeee2b85ce1076f73493186cae0e3b0d8fe179b43dc9553c70e46',900]);
if(a.moods)requests.push(['2-2','area-2',23994,'c91d9e96b7833bef2216b2e57ff5c61570e365a2e18d1fbd5ff93422c8812970',1900]);
if(a.moods)requests.push(['2-2','area-2',25502,'8d3816f56f083556e2fca5efe24bac7f7e0ae0b0cb279c544d66183e864147b9',1000]);
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

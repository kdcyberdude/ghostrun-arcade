/** Retain authentic parser RAM for declared mid-page roof fixtures; this is initial state, never a replay correction. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},samples:{type:'string'},out:{type:'string'}}});
if(!a.traces||!a.samples||!a.out)throw Error('--traces, --samples level:frame,... and --out required');
const samples=a.samples.split(',').map(sample=>{
 const [level,index]=sample.split(':'),frame=Number(index),bytes=fs.readFileSync(path.join(a.traces,level,'ram.bin')),r=bytes.subarray(frame*2048,(frame+1)*2048);
 return {level,frame,pointer:r[0xe7]+r[0xe8]*256,camera:r[0x71a]*256+r[0x71c],task:r[0x71f],scroll:r[0x73d],column:r[0x725]*16+r[0x726],locked:Boolean(r[0x723])};
});
fs.writeFileSync(a.out,JSON.stringify({source:'Native v2 RAM fields071F/073D/0725/0726/0723 at the declared roof fixture cameras; no later RAM is applied.',samples},null,1)+'\n');

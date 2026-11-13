/** Native free-slot ProcessEnemyData attempts and resulting cursor registers.
 * node tools/harness/native-water-stream-events.mjs --traces DIR [--moods DIR --out FILE] */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},moods:{type:'string'},out:{type:'string',default:'tests/fixtures/native-water-stream-events.json'}}});
if(!a.traces)throw Error('--traces required');
const inputs=[];for(const l of ['2-2','7-2'])inputs.push({name:l,file:path.join(a.traces,l,'ram.bin')});
if(a.moods){const groups=new Map();for(const e of JSON.parse(fs.readFileSync(path.join(a.moods,'water-epoch-inventory-29b5de7.json'))))if(e.area==='area-2')groups.set(e.sha256,true);for(const sha of groups.keys())inputs.push({name:sha,file:path.join(a.moods,'captures',sha,'ram.bin')});}
const grouped=new Map();let frames=0;
for(const input of inputs){const data=fs.readFileSync(input.file);for(let row=1;row<data.length/2048;row++){
 const p=data.subarray((row-1)*2048,row*2048),r=data.subarray(row*2048,(row+1)*2048);
 if(p[0x74e]!==0||r[0x74e]!==0||p[0xe9]+256*p[0xea]!==0xa171||r[0xe9]+256*r[0xea]!==0xa171||p[0x770]!==1||r[0x770]!==1||p[0x772]!==3||r[0x772]!==3||r[0x776]&1||![7,8,11].includes(r[14]))continue;
 const flags=Array.from(p.subarray(15,21)),before=[p[0x739],p[0x73a],p[0x73b]],after=[r[0x739],r[0x73a],r[0x73b]];
 const task=p[0x71f]&7,queue=p[0x6cd],camera=r[0x71a]*256+r[0x71c],hard=Boolean(r[0x6cc]),key=JSON.stringify([before,flags,task,queue,camera,hard,after]);
 const prior=grouped.get(key);if(prior)prior[9]++;else grouped.set(key,[input.name,row,before,flags,task,queue,camera,hard,after,1]);frames++;
}}
const events=[...grouped.values()];fs.writeFileSync(a.out,JSON.stringify(events)+'\n');console.log({frames,unique:events.length});

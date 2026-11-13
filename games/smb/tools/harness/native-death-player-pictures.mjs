/** Add independently captured PlayerGfxOffset/PlayerFacingDir to source entry rows. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},fixture:{type:'string',default:'tests/fixtures/native-death-load-runtime.json'}}});if(!a.traces)throw Error('--traces is required');
const data=JSON.parse(fs.readFileSync(a.fixture));let count=0;
for(const run of data.runs){const ram=fs.readFileSync(path.join(a.traces,run.level,'ram.bin'));for(const row of run.rows){const r=ram.subarray(row.frame*2048,(row.frame+1)*2048);if(r[0x770]!==1||r[0x772]!==3||r[14]!==7)continue;row.cell=r[0x6d5]/8;row.facing=r[0x33]===2?-1:1;count++;}}
fs.writeFileSync(a.fixture,JSON.stringify(data)+'\n');console.log(count,'native entry pictures');

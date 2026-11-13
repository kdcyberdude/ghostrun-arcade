/** Refresh only source EnemyData page/selection in retained runtime fixtures.
 * npx tsx tools/harness/native-runtime-cursor-refresh.mjs --traces DIR --entrances DIR --fixture FILE --levels 7-4
 * Existing entrance fields and controller bytes must agree with the native source.
 * Expected rows are never regenerated or changed. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import {decodeEntrance} from './native-entrance.mjs';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},fixture:{type:'string'},levels:{type:'string'}}});
if(!a.traces||!a.entrances||!a.fixture||!a.levels)throw Error('--traces, --entrances, --fixture and --levels required');
const data=JSON.parse(fs.readFileSync(a.fixture,'utf8')),levels=new Set(a.levels.split(','));
const hash=b=>createHash('sha256').update(b).digest('hex');
function retainedFields(old,current,label){
 if(old&&typeof old==='object'){for(const key of Object.keys(old))retainedFields(old[key],current?.[key],`${label}.${key}`);}
 else assert.deepEqual(current,old,label);
}
for(const run of data.runs.filter(r=>levels.has(r.level))){
 const dir=path.join(a.traces,run.level),initial=fs.readFileSync(path.join(dir,'initial.ram')),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),receipt=fs.readFileSync(path.join(a.entrances,run.level,'entrance.json'));
 const entrance=decodeEntrance(initial,JSON.parse(receipt));retainedFields(run.entrance,entrance,`${run.level} entrance`);
 assert.deepEqual(run.pads,Array.from(pads.subarray(0,run.pads.length)),`${run.level} native pads`);
 const expected=hash(JSON.stringify(Object.fromEntries(Object.entries(run).filter(([key])=>key!=='entrance'))));
 run.entrance.enemyDataPage=entrance.enemyDataPage;run.entrance.enemyDataSelected=entrance.enemyDataSelected;
 assert.equal(hash(JSON.stringify(Object.fromEntries(Object.entries(run).filter(([key])=>key!=='entrance')))),expected);
 console.log(JSON.stringify({level:run.level,page:entrance.enemyDataPage,selected:entrance.enemyDataSelected,initialSha256:hash(initial),padsSha256:hash(pads),ramSha256:hash(ram),receiptSha256:hash(receipt),retainedRunSha256:expected}));
}
fs.writeFileSync(a.fixture,JSON.stringify(data)+'\n');

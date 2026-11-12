import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {observedLevels} from '../src/levels.js';
import {evidenceVisits,mismatches,type MapEvidence} from '../tools/harness/native-level-map.js';

// Every level column the native runs drew into the NES block buffer (evidence/native-level-map.json, made by tools/harness/native-level-map.ts
// from the per-frame RAM traces of all 32 levels) must equal the remake's area tiles: the native metatile id where the buffer holds one, and
// nothing collidable where it holds 0 (ids below the collision bound are stored as 0 natively). Spring cells match the spring object.
const evidence:MapEvidence=JSON.parse(fs.readFileSync(new URL('../evidence/native-level-map.json',import.meta.url),'utf8'));
const levels=observedLevels();

test('native level map covers all 32 levels',()=>{
 assert.equal(Object.keys(evidence.levels).length,32);
 for(const [id,e] of Object.entries(evidence.levels))assert.ok(e.visits.length>0&&e.visits.every(v=>v.count>0),id);
});

for(const id of Object.keys(evidence.levels))test(`native level map ${id}: every seen column matches the remake tiles`,()=>{
 const ms=mismatches(levels,id,evidenceVisits(evidence.levels[id]));
 assert.deepEqual(ms.slice(0,10),[],`${ms.length} mismatching cells`);
});

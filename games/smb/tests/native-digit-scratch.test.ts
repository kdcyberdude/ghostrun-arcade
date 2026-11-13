import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import fs from 'node:fs';import {NATIVE_DIGIT_MODIFIER3_AT_ENEMY_INIT} from '../src/native-digit-scratch.js';import fixture from './fixtures/native-digit-scratch.json';
test('actual ROM digit writers erase the vine alias before every following native enemy initialization',()=>{
 assert.equal(fixture.exhaustive.cases,3072);assert.equal(fixture.cases.length,50);assert.equal(fixture.sourceWriters.length,12);assert.equal(fixture.sourceWriters.filter(w=>w.instruction==='sta DigitModifier,x').length,2);
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../tools/harness/native-digit-procedure.cpp',import.meta.url))).digest('hex'),fixture.cpuWrapperSha256);
 const families=new Set<string>();let transient=0,initialized=0;
 for(const c of fixture.cases){
  families.add(c.procedure);assert.deepEqual(c.scratchAfter,[0,0,0,0,0,0,0],c.label);assert.equal(c.scratchAfter[4],NATIVE_DIGIT_MODIFIER3_AT_ENEMY_INIT,c.label);
  assert.ok(c.minimumStackPointer>0x39,c.label);assert.ok(c.writes137.length>0,c.label);assert.equal(c.writes137.at(-1)![1],0,c.label);
  if(c.writes137.some(([,value])=>value!==0))transient++;
  if(c.eligibleVineInit){initialized++;assert.deepEqual([c.eligibleVineInit.y,c.eligibleVineInit.state,c.eligibleVineInit.id,c.eligibleVineInit.flag,c.eligibleVineInit.scratch],[NATIVE_DIGIT_MODIFIER3_AT_ENEMY_INIT,0,47,1,0],c.label);}
 }
 assert.deepEqual([...families].sort(),['coin','firework','floaty','initialize','pole','timer']);assert.equal(transient,40);assert.equal(initialized,48);
});

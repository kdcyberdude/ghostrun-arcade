import {test} from 'node:test';import assert from 'node:assert/strict';import {nativeFootImpediment} from '../src/native-player-bg.js';import proof from './fixtures/native-player-bg-proof.json';
test('foot impedance matches6144 actual PRG0 calls, including byte-zero fractions, opposed movement and page wrap',()=>{
 assert.equal(proof.impede.length,6144);
 for(const [side,byte,fraction,x,outByte,outFraction,outX,bits,timer]of proof.impede){
  const speed=((byte^128)-128)*256+fraction,n=nativeFootImpediment(side===1?1:-1,speed);
  assert.equal((x+n.offset)&65535,outX);assert.equal(n.speed,((outByte^128)-128)*256+outFraction);assert.equal(255&(side===1?254:253),bits);assert.equal(n.offset?16:0,timer);
 }
});
test('actual InitJS first13opcode bytes clear every retained Y fraction and force before jump physics',()=>{
 assert.equal(proof.initJS.length,512);for(const[fraction,force,nextFraction,nextForce,timer]of proof.initJS){assert.deepEqual([nextFraction,nextForce,timer],[0,0,32],`fraction${fraction} force${force}`);}
});

import {surveyPlayerBg} from '../tools/harness/native-player-bg-survey.js';
test('both complete retained World1-1 diagnostic epochs match on every row, including after their former first failures',()=>{
 const reports=surveyPlayerBg();assert.equal(reports.length,2);assert.equal(reports.reduce((n,r)=>n+r.frames,0),5191);
 for(const r of reports){assert.deepEqual(r.counts,{match:r.frames,mismatch:0,unchecked:0},r.sha256);assert.deepEqual(r.perField,{});assert.deepEqual(r.gaps,{});assert.equal(r.coverage.completeInputSequence,true);}
});

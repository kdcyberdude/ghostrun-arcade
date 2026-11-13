import{test}from'node:test';import assert from'node:assert/strict';import{nativeEnemyInjuryTurn}from'../src/native-enemy-injury-turn.js';import proof from'./fixtures/native-enemy-injury-turn-proof.json';
test('injury turn matches13440 complete native PlayerEnemyCollision calls across22 enemy IDs and unsigned-relative edges',()=>{
 assert.equal(proof.rows.length,13440);let turns=0;
 for(const[id,direction,speed,playerRelative,enemyRelative,area,injury,playerSpeed,outDirection,outSpeed,_engine,_master,stompTimer]of proof.rows){
  const n={direction,speed};if(nativeEnemyInjuryTurn(n,{id,playerRelative,enemyRelative,playerSpeed:(playerSpeed^128)-128,stompTimer,injuryTimer:injury,water:area===0}))turns++;
  assert.deepEqual(n,{direction:outDirection,speed:outSpeed},`id${id} dir${direction} speed${speed} relative${playerRelative}/${enemyRelative} area${area} injury${injury} playerSpeed${playerSpeed}`);
 }assert.ok(turns>0);
});

import{surveyEnemyInjuryTurn}from'../tools/harness/native-enemy-injury-turn-survey.js';
test('continuous native World1-1 injury reverses the own-hit Goomba before its held movement and retains that motor until load',()=>{
 const r=surveyEnemyInjuryTurn();assert.equal(r.initial.status,'match');assert.equal(r.frames,3031);assert.equal(r.world11Frames,3029);assert.equal(r.hitFrame,526);
 for(const row of r.turnRows)assert.deepEqual(row.sim,row.native,`source${row.frame}`);
 assert.equal(r.bodyCounts.match+r.bodyCounts.mismatch,210);assert.equal(r.bodyCounts.unchecked,0);assert.equal(r.bodyFields.speed??0,0);assert.equal(r.bodyFields.direction??0,0);
 // Every STATE and body-X row is still observed. Existing load-control and
 // load-clear X-fraction discrepancies stay in the survey, outside this turn fix.
 assert.equal(r.counts.match+r.counts.mismatch+r.counts.unchecked,r.frames);
});

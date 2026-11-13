/** Small frozen gate cases; no native trace cache, simulation replay or external report files needed. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {compareFields,compareReports,policy,reportFingerprint} from './compare.mjs';
const game=fileURLToPath(new URL('../../../',import.meta.url)),root=path.resolve(game,'../..');
const readiness=JSON.parse(fs.readFileSync(path.join(game,'evidence/native-readiness-coverage-1-2.json')));
const fields=()=>({dead:null,time:null,score:null,coins:null,cam:null,x:null,y:null,enemy:null});
const smallReport=()=>Array.from({length:32},(_,i)=>({level:`${(i/4|0)+1}-${i%4+1}`,frames:10,fields:fields(),strict:{status:'pass',first:null,fields:{...fields(),missing:null,extra:null,kind:null,position:null,state:null},coverage:{inputFrames:10,ramFrames:10,frames:10,alignedFrames:10,nativeMappedFrames:10,comparedEntityRows:0,complete:true},diagnostics:[]}}));

test('identical complete reports pass; unknown earlier fields and removed fields fail',()=>{
 const before=smallReport();assert.equal(compareReports(before,before).status,'NON_REGRESSION_PASS');assert.equal(compareReports(before,before).baselineFingerprint,reportFingerprint(before));
 const after=structuredClone(before);after[0].fields.x=1;assert.ok(compareReports(before,after).failures.some(f=>f.scope==='legacy'&&f.field==='x'));
 delete after[0].fields.y;assert.ok(compareReports(before,after).failures.some(f=>f.code==='removed-field'));
});
test('level sets, native input lengths and compared coverage cannot shrink',()=>{
 const before=smallReport();assert.ok(compareReports(before,before.slice(1)).failures.some(f=>f.code==='invalid-level-set'));
 for(const field of ['frames','alignedFrames','nativeMappedFrames','comparedEntityRows']){const after=structuredClone(before);before[0].strict.coverage[field]=10;after[0].strict.coverage[field]=9;assert.ok(compareReports(before,after).failures.some(f=>f.code==='coverage-loss'&&f.field===field));}
 const after=structuredClone(before);after[0].strict.coverage.inputFrames=11;assert.ok(compareReports(before,after).failures.some(f=>f.code==='changed-native-input-length'));after[0].strict.coverage.complete=false;assert.ok(compareReports(before,after).failures.some(f=>f.code==='lost-complete-coverage'));
});
test('ID51 coverage admits only the documented earlier floor',()=>{
 const result=compareFields('5-1','legacy',{enemy:1686},{enemy:1281});assert.equal(result.failures.length,0);assert.equal(result.changes[0].classification,'coverage');assert.equal(compareFields('5-1','legacy',{enemy:1686},{enemy:1280}).failures.length,1);
 assert.deepEqual([policy.coverage.activeRows,policy.coverage.birthRows,policy.coverage.legacyAdapterRows],[4703,251,4452]);
});
test('source causal rules require the unchanged earlier upstream field',()=>{
 const context={before:{legacy:{y:444}},after:{legacy:{y:444}}};assert.equal(compareFields('7-1','legacy',{cam:1577},{cam:1034},context).failures.length,0);context.after.legacy.y=445;assert.equal(compareFields('7-1','legacy',{cam:1577},{cam:1034},context).failures.length,1);
});
const waterBefore={cam:3666,dead:2937,x:2712,y:2658},waterAfter={cam:3582,dead:2937,x:3335,y:3335};
const waterContext=()=>({run:'water-down-strokes',before:{legacy:waterBefore},after:{legacy:waterAfter}});
test('water camera classification is exact-run/exact-frame and preserves X/Y improvements',()=>{
 const context=waterContext(),result=compareFields('6-2','legacy',waterBefore,waterAfter,context);assert.equal(result.failures.length,0);assert.equal(result.changes.find(c=>c.field==='cam').classification,'causal');for(const field of ['x','y'])assert.equal(result.changes.find(c=>c.field===field).classification,'improvement');
 for(const run of ['water-reverse',undefined])assert.equal(compareFields('6-2','legacy',waterBefore,waterAfter,{...context,run}).failures.length,1);
 assert.equal(compareFields('6-2','legacy',waterBefore,waterAfter,{...context,after:{legacy:{...waterAfter,dead:2938}}}).failures.length,1);
 for(const cam of [3581,3583])assert.equal(compareFields('6-2','legacy',waterBefore,{...waterAfter,cam},context).failures.length,1);
});
test('readiness coverage is bound to the historical native proof and exact baseline fingerprint',()=>{
 const context={baselineFingerprint:readiness.baselineFingerprint};assert.deepEqual(readiness.firsts,{historicalConditionalReadout:null,sameRuntimeCurrentReadout:3059,batchBCurrentReadout:3059});assert.equal(readiness.allOtherBaselineStrictFieldsUnchanged,true);assert.equal(readiness.allBaselineCoverageUnchanged,true);
 assert.equal(compareFields('1-2','strict',{'continuation.load.ready':null},{'continuation.load.ready':3059},context).failures.length,0);
 for(const candidate of [{frame:3058,context},{frame:3059,context:{baselineFingerprint:'different-baseline'}},{frame:3059,context:undefined}])assert.equal(compareFields('1-2','strict',{'continuation.load.ready':null},{'continuation.load.ready':candidate.frame},candidate.context).failures.length,1);
});
test('Hammer hold policy requires exact state and unchanged extra/missing/death',()=>{
 const context={before:{strict:{extra:264,missing:341},legacy:{dead:3813}},after:{strict:{extra:264,missing:341},legacy:{dead:3813}}};assert.equal(compareFields('8-3','strict',{state:3814},{state:3813},context).failures.length,0);
 for(const state of [3812,3810])assert.equal(compareFields('8-3','strict',{state:3814},{state},context).failures.length,1);
 for(const [scope,field,value]of [['strict','extra',265],['strict','missing',342],['legacy','dead',3812]]){const changed=structuredClone(context);changed.after[scope][field]=value;assert.equal(compareFields('8-3','strict',{state:3814},{state:3813},changed).failures.length,1);}
});
test('portable policy evidence matches the checked-in source proof bytes',()=>{
 for(const rule of policy.rules)if(typeof rule.evidence==='object'){const bytes=fs.readFileSync(path.join(root,rule.evidence.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),rule.evidence.sha256,rule.evidence.path);}
});
test('CLI water integration retains exact context, payload checks and native ID51 counts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'smb-batch-gate-test-'));try{
  const baseline=path.join(dir,'before.json'),candidate=path.join(dir,'after.json'),water=path.join(dir,'water.json'),cannon=path.join(dir,'cannon.json'),out=path.join(dir,'comparison.json');fs.writeFileSync(baseline,JSON.stringify(smallReport()));fs.writeFileSync(candidate,JSON.stringify(smallReport()));const w={excerpts:[{file:'6-2.water-down-strokes.json',level:'6-2',run:'water-down-strokes',baselineFirsts:waterBefore,candidateFirsts:waterAfter,baselinePayload:'unchanged',payloadBefore:'unchanged',payloadAfter:'unchanged'}]};fs.writeFileSync(water,JSON.stringify(w));fs.writeFileSync(cannon,JSON.stringify({totals:policy.coverage}));
  const run=()=>spawnSync(process.execPath,[fileURLToPath(new URL('./compare.mjs',import.meta.url)),'--baseline',baseline,'--candidate',candidate,'--water',water,'--cannon-coverage',cannon,'--out',out],{encoding:'utf8'});
  assert.equal(run().status,0);assert.equal(JSON.parse(fs.readFileSync(out)).failures.length,0);
  w.excerpts[0].payloadAfter='mutated';fs.writeFileSync(water,JSON.stringify(w));assert.equal(run().status,1);assert.ok(JSON.parse(fs.readFileSync(out)).failures.some(f=>f.code==='water-payload-changed'));
  fs.writeFileSync(cannon,JSON.stringify({totals:{...policy.coverage,activeRows:4702}}));assert.equal(run().status,1);assert.ok(JSON.parse(fs.readFileSync(out)).failures.some(f=>f.code==='changed-cannon-input-coverage'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

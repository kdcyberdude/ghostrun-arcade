import {test} from 'node:test';import assert from 'node:assert/strict';
import {summarizeCurrent,failingRecordings,STATE_SCHEMA} from './current-results.mjs';import {inventoryHash,emptyResult} from './combined-replay.mjs';import {policyHash} from './visual-check.mjs';import {renderCombined} from './combined-view.mjs';
const inventory=[{id:'a',frames:6,padsSha256:'a'},{id:'b',frames:4,padsSha256:'b'}];
const span=(from,to,level,state,picture='unchecked')=>({from,to,level,state,picture});
const stateReport=(runs,extra={})=>({schema:STATE_SCHEMA,measures:'state-only',protocol:'continuous-from-recorded-start',runtimeCommit:'abc1234',runtimeDirty:false,inventorySha256:inventoryHash(inventory),scope:{levels:['1-1'],frameSelection:'all-target-level-frames'},generatedAt:'2026-11-14T00:00:00Z',runs,...extra});
const runs=()=>[{id:'a',frames:6,reseeded:false,spans:[span(0,1,null,'unchecked'),span(1,3,'1-1','match'),span(3,4,'1-1','mismatch'),span(4,6,'1-2','unchecked')]},{id:'b',frames:4,reseeded:false,spans:[span(0,4,'1-1','match')]}];
test('state-only receipts count state per level and never report pictures',()=>{
 const s=summarizeCurrent(stateReport(runs()),inventory,policyHash);
 assert.equal(s.kind,'state-only');assert.deepEqual(Object.keys(s.levels),['1-1']);
 assert.deepEqual([s.levels['1-1'].state.matching,s.levels['1-1'].state.notMatching,s.levels['1-1'].recordings],[6,1,2]);
 assert.equal(s.levels['1-1'].picture.matching,0);
});
test('state-only receipts reject picture verdicts, other inventories, checks outside scope and gaps',()=>{
 const bad=[stateReport(runs().map((r,i)=>i?r:{...r,spans:[span(0,6,'1-1','match','match')]})),stateReport(runs(),{inventorySha256:'x'}),
  stateReport(runs().map((r,i)=>i?r:{...r,spans:[span(0,6,'1-2','match')]})),stateReport(runs().map((r,i)=>i?r:{...r,spans:[span(0,5,'1-1','match')]})),stateReport(runs(),{measures:'combined'})];
 for(const r of bad)assert.throws(()=>summarizeCurrent(r,inventory,policyHash));
});
test('failure plan lists recordings with any mismatch in the level, worst first',()=>{
 const plan=failingRecordings(stateReport(runs()),'1-1');
 assert.deepEqual([plan.visiting,plan.failing,plan.failedFrames,plan.ids,plan.measures],[2,1,1,['a'],'state-only']);
});
test('view keeps historical totals and does not list state-only results',()=>{
 const current={head:'abc1234',dirty:false,results:[{...summarizeCurrent(stateReport(runs()),inventory,policyHash),current:true,file:'x'}]};
 const text=renderCombined({moodCount:1,referenceCount:1,result:{...emptyResult(inventory),reported:true,runtime:'cca2e44'},current},{width:118});
 assert.match(text,/HISTORICAL FULL AUDIT · build cca2e44/);assert.doesNotMatch(text,/STATE ONLY|NEWER BUILD RESULTS/);assert.match(text,/All cells historical build cca2e44/);
 const older={...current,results:[{...current.results[0],current:false}]};assert.doesNotMatch(renderCombined({moodCount:1,referenceCount:1,result:emptyResult(inventory),current:older},{width:118}),/STATE ONLY|OLDER BUILD abc1234/);
});
test('a full audit of the current game build is titled CURRENT, not historical',()=>{
 const current={head:'abc1234',dirty:false,fullCurrent:true,results:[{...summarizeCurrent(stateReport(runs()),inventory,policyHash),current:true,file:'x'}]};
 const text=renderCombined({moodCount:1,referenceCount:1,result:{...emptyResult(inventory),reported:true,runtime:'abc1234',progress:{status:'running',done:0,total:2,directlyComparedFrames:0,started:'2026-11-14T00:00:00Z',updated:'2026-11-14T00:00:00Z'}},current},{width:118});
 assert.match(text,/CURRENT FULL AUDIT · build abc1234 · RUNNING/);assert.doesNotMatch(text,/HISTORICAL/);assert.match(text,/All cells current build abc1234/);
});

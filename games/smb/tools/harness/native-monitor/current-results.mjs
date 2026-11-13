import assert from 'node:assert/strict';import {summarizeCombined,validateScope,inventoryHash} from './combined-replay.mjs';
/** Receipt of tools/harness/native-state-replay.ts: state verdicts only, pictures never compared. */
export const STATE_SCHEMA='smb-state-replay-v1';
const counter=()=>({matching:0,notMatching:0,unchecked:0,total:0});
const bucket=x=>x==='match'?'matching':x==='mismatch'?'notMatching':'unchecked';
const add=(c,x,n)=>{c[bucket(x)]+=n;c.total+=n;};

/** Per-level counts from a newer-build receipt, kept apart from the full historical audit.
 * kind 'state-only' never reports picture or joint results; 'state+picture' is a scoped v2 audit. */
export function summarizeCurrent(report,inventory,policyHash){
 const expected=new Map(inventory.map(r=>[r.id,r]));let kind,levels,dirty=false,measured;
 if(report.schema===STATE_SCHEMA){
  kind='state-only';assert.equal(report.measures,'state-only');assert.equal(report.inventorySha256,inventoryHash(inventory),'State receipt is for another inventory');
  assert.equal(report.protocol,'continuous-from-recorded-start');assert.ok(report.runtimeCommit);
  levels=report.scope?validateScope(report.scope).levels:null;dirty=report.runtimeDirty!==false;measured=report.generatedAt;
  const seen=new Set();
  for(const run of report.runs){
   assert.ok(expected.has(run.id),'Unknown recording '+run.id);assert.ok(!seen.has(run.id),'Duplicate recording');seen.add(run.id);assert.equal(run.frames,expected.get(run.id).frames);assert.equal(run.reseeded,false);
   let cursor=0;for(const s of run.spans){assert.equal(s.from,cursor);assert.ok(s.to>s.from);assert.equal(s.picture,'unchecked','A state-only receipt cannot carry picture verdicts');if(levels&&!levels.includes(s.level))assert.equal(s.state,'unchecked');cursor=s.to;}assert.equal(cursor,run.frames);
  }
 }else{
  const s=summarizeCombined(report,inventory,policyHash);
  assert.ok(s.scope,'Full-inventory audits are registered with --add-combined');
  assert.ok(['scoped-complete','shard-complete'].includes(report.progress?.status),'Only finished scoped audits are registered');
  assert.equal(s.errors.length,0,'Audit has errors');
  kind='state+picture';levels=s.scope.levels;measured=report.progress.finished;
 }
 const out={kind,runtime:report.runtimeCommit,dirty,measured,recordings:report.runs.length,inventoryRecordings:inventory.length,timing:report.timing,levels:{}};
 for(const run of report.runs)for(const s of run.spans){
  if(!s.level||levels&&!levels.includes(s.level))continue;
  const e=out.levels[s.level]??={recordings:new Set(),state:counter(),picture:counter(),joint:counter()},n=s.to-s.from;
  e.recordings.add(run.id);add(e.state,s.state,n);add(e.picture,s.picture,n);
  add(e.joint,s.state==='mismatch'||s.picture==='mismatch'?'mismatch':s.state==='match'&&s.picture==='match'?'match':'unchecked',n);
 }
 for(const e of Object.values(out.levels))e.recordings=e.recordings.size;
 return out;
}

/** Recordings with any state or picture mismatch in one level, most failed frames first (targeted re-runs). */
export function failingRecordings(report,level){
 assert.match(level,/^[1-8]-[1-4]$/);
 const runs=[];let visiting=0;
 for(const run of report.runs){
  const spans=run.spans.filter(s=>s.level===level);if(spans.length)visiting++;
  const windows=spans.filter(s=>s.state==='mismatch'||s.picture==='mismatch').map(s=>({from:s.from,to:s.to,state:s.state,picture:s.picture}));
  const failedFrames=windows.reduce((n,s)=>n+s.to-s.from,0);
  if(failedFrames)runs.push({id:run.id,frames:run.frames,failedFrames,firstFailedFrame:windows[0].from,windows});
 }
 runs.sort((a,b)=>b.failedFrames-a.failedFrames||a.id.localeCompare(b.id));
 return {schema:'smb-targeted-plan-v2',level,sourceSchema:report.schema,sourceRuntime:report.runtimeCommit,measures:report.schema===STATE_SCHEMA?'state-only':'state+picture',
  visiting,failing:runs.length,failedFrames:runs.reduce((n,r)=>n+r.failedFrames,0),ids:runs.map(r=>r.id),runs,created:new Date().toISOString()};
}

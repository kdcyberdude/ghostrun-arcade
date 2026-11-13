import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
export const sha=x=>createHash('sha256').update(x).digest('hex');
export const counting='observed-every-frame-v2';
export function inventoryHash(runs){return sha(JSON.stringify(runs.map(r=>[r.id,r.frames,r.padsSha256,r.initialRamSha256??null]).sort((a,b)=>a[0].localeCompare(b[0]))));}
const counter=()=>({matching:0,notMatching:0,unchecked:0,total:0});
const group=()=>({...counter(),state:counter(),picture:counter()});
export function emptyResult(inventory){const total=inventory.reduce((n,r)=>n+r.frames,0);return {...group(),recordings:inventory.length,total,unchecked:total,state:{...counter(),total,unchecked:total},picture:{...counter(),total,unchecked:total},levels:Object.fromEntries(Array.from({length:32},(_,i)=>[`${Math.floor(i/4)+1}-${i%4+1}`,group()])),unassigned:group(),reported:false,runs:[]};}
/** Every frame stands independently. First mismatch is diagnostic, never a tail rule. */
export function summarizeCombined(report,inventory,policyHash){
 assert.equal(report.schema,'smb-combined-replay-v2','Legacy sticky receipts cannot establish actual per-frame counts');assert.equal(report.counting,counting);assert.equal(report.unit,'input-frame');assert.equal(report.protocol,'continuous-from-recorded-start');assert.ok(report.runtimeCommit);assert.equal(report.visualPolicyHash,policyHash);assert.equal(report.inventorySha256,inventoryHash(inventory));
 const out=emptyResult(inventory);Object.assign(out,{matching:0,notMatching:0,unchecked:0,state:counter(),picture:counter(),reported:true,runtime:report.runtimeCommit,progress:{...report.progress,done:report.runs.length,total:inventory.length,directlyComparedFrames:report.runs.reduce((n,r)=>n+(r.directlyComparedFrames??0),0)},errors:report.errors??[]});
 const expected=new Map(inventory.map(r=>[r.id,r]));assert.equal(expected.size,inventory.length);const seen=new Set();
 const status=x=>x==='match'?'matching':x==='mismatch'?'notMatching':'unchecked';
 const add=(target,state,picture,count)=>{const joint=state==='mismatch'||picture==='mismatch'?'notMatching':state==='match'&&picture==='match'?'matching':'unchecked';target[joint]+=count;target.total+=count;target.state[status(state)]+=count;target.state.total+=count;target.picture[status(picture)]+=count;target.picture.total+=count;};
 out.total=0;
 for(const run of report.runs){
  const input=expected.get(run.id);assert.ok(input);assert.ok(!seen.has(run.id));seen.add(run.id);assert.equal(run.frames,input.frames);assert.equal(run.reseeded,false);assert.equal(run.directlyComparedFrames,run.frames,'A completed run must observe every input, including failed tails');
  let cursor=0,firstFailure=null;const c=group();
  for(const span of run.spans){assert.equal(span.from,cursor);assert.ok(Number.isInteger(span.to)&&span.to>span.from&&span.to<=run.frames);assert.ok(['match','mismatch','unchecked'].includes(span.state));assert.ok(['match','mismatch','unchecked'].includes(span.picture));assert.ok(span.level===null||out.levels[span.level]);
   // Initial verification remains provenance; unknown earlier rows never contaminate later observations.
   const state=span.state,picture=span.picture,n=span.to-span.from;
   if(firstFailure===null&&(state==='mismatch'||picture==='mismatch'))firstFailure=span.from;
   add(out,state,picture,n);add(c,state,picture,n);add(span.level===null?out.unassigned:out.levels[span.level],state,picture,n);cursor=span.to;
  }
  assert.equal(cursor,run.frames);out.runs.push({id:run.id,...c,firstFailure});
 }
 for(const r of inventory)if(!seen.has(r.id)){add(out,'unchecked','unchecked',r.frames);add(out.unassigned,'unchecked','unchecked',r.frames);}
 assert.equal(out.total,inventory.reduce((n,r)=>n+r.frames,0));for(const c of [out,out.state,out.picture])assert.equal(c.matching+c.notMatching+c.unchecked,c.total);return out;
}

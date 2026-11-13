import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
export const sha=x=>createHash('sha256').update(x).digest('hex');
export const counting='observed-every-frame-v2';
export function inventoryHash(runs){return sha(JSON.stringify(runs.map(r=>[r.id,r.frames,r.padsSha256,r.initialRamSha256??null]).sort((a,b)=>a[0].localeCompare(b[0]))));}
export function validateScope(scope){
 if(scope===undefined)return;
 assert.equal(scope.frameSelection,'all-target-level-frames');assert.ok(Array.isArray(scope.levels)&&scope.levels.length>0);assert.equal(new Set(scope.levels).size,scope.levels.length);assert.ok(scope.levels.every(x=>typeof x==='string'&&/^[1-8]-[1-4]$/.test(x)));
 return {levels:[...scope.levels].sort(),frameSelection:scope.frameSelection};
}
export function verifiedRunSource(run,report){
 const p=run.provenance,hashes=['ramSha256','initialRamSha256','nativePixelsSha256','nativeEmphasisSha256','observedPixelStreamSha256','observedEmphasisStreamSha256'].every(key=>/^[a-f0-9]{64}$/.test(p?.[key]??''));
 return Boolean(hashes&&p.fullPictureStreamAuthenticated===true&&p.sourceVerifiedAfterRun===true&&p.runtimeCommit===report.runtimeCommit&&report.sourceHashes&&typeof report.toolSha256==='string'&&report.toolSha256.length>0&&p.toolManifestSha256===sha(JSON.stringify(report.sourceHashes))&&report.toolSha256===report.sourceHashes['tools/harness/combined-monitor-audit.ts']&&p.observedPixelStreamSha256===p.nativePixelsSha256&&p.observedEmphasisStreamSha256===p.nativeEmphasisSha256);
}
export function validateScopedRun(run,scope){
 assert.ok(Number.isInteger(run.selectedFrames)&&run.selectedFrames>=0&&run.selectedFrames<=run.frames);assert.equal(run.directlyComparedFrames,run.selectedFrames,'Every selected frame must be observed independently');
 const ranges=[];
 for(const span of run.spans){
  if(scope.levels.includes(span.level)){const last=ranges.at(-1);if(last?.to===span.from)last.to=span.to;else ranges.push({from:span.from,to:span.to});}
  else{assert.equal(span.state,'unchecked','Nonselected states must remain unchecked');assert.equal(span.picture,'unchecked','Nonselected pictures must remain unchecked');}
 }
 assert.deepEqual(run.selectedFrameSpans,ranges,'Selected receipt must equal all target-level spans');assert.equal(run.selectedFrames,ranges.reduce((n,s)=>n+s.to-s.from,0));assert.equal(run.replayedFrames,ranges.at(-1)?.to??0,'Continuous replay must reach the last selected frame');assert.equal(run.provenance?.selectedFrameSpansSha256,sha(JSON.stringify(ranges)),'Unauthenticated selected-frame receipt');
}
const counter=()=>({matching:0,notMatching:0,unchecked:0,total:0});
const group=()=>({...counter(),state:counter(),picture:counter()});
export function emptyResult(inventory){const total=inventory.reduce((n,r)=>n+r.frames,0);return {...group(),recordings:inventory.length,total,unchecked:total,state:{...counter(),total,unchecked:total},picture:{...counter(),total,unchecked:total},levels:Object.fromEntries(Array.from({length:32},(_,i)=>[`${Math.floor(i/4)+1}-${i%4+1}`,group()])),unassigned:group(),reported:false,runs:[]};}
/** Every frame stands independently. First mismatch is diagnostic, never a tail rule. */
export function summarizeCombined(report,inventory,policyHash){
 assert.equal(report.schema,'smb-combined-replay-v2','Legacy sticky receipts cannot establish actual per-frame counts');assert.equal(report.counting,counting);assert.equal(report.unit,'input-frame');assert.equal(report.protocol,'continuous-from-recorded-start');assert.ok(report.runtimeCommit);assert.equal(report.visualPolicyHash,policyHash);assert.equal(report.inventorySha256,inventoryHash(inventory));
 const scope=validateScope(report.scope),out=emptyResult(inventory);if(scope)assert.notEqual(report.progress?.status,'complete','Scoped completion must be explicit');else assert.notEqual(report.progress?.status,'scoped-complete');if(scope)Object.assign(out,{scope,selected:group()});Object.assign(out,{matching:0,notMatching:0,unchecked:0,state:counter(),picture:counter(),reported:true,runtime:report.runtimeCommit,progress:{...report.progress,done:report.runs.length,total:inventory.length,directlyComparedFrames:report.runs.reduce((n,r)=>n+(r.directlyComparedFrames??0),0)},errors:report.errors??[]});
 const expected=new Map(inventory.map(r=>[r.id,r]));assert.equal(expected.size,inventory.length);const seen=new Set();
 const status=x=>x==='match'?'matching':x==='mismatch'?'notMatching':'unchecked';
 const add=(target,state,picture,count)=>{const joint=state==='mismatch'||picture==='mismatch'?'notMatching':state==='match'&&picture==='match'?'matching':'unchecked';target[joint]+=count;target.total+=count;target.state[status(state)]+=count;target.state.total+=count;target.picture[status(picture)]+=count;target.picture.total+=count;};
 out.total=0;
 for(const run of report.runs){
  const input=expected.get(run.id);assert.ok(input);assert.ok(!seen.has(run.id));seen.add(run.id);assert.equal(run.frames,input.frames);assert.equal(run.reseeded,false);if(scope){validateScopedRun(run,scope);assert.ok(verifiedRunSource(run,report),'Scoped evidence must authenticate native streams and one source build');}else assert.equal(run.directlyComparedFrames,run.frames,'A completed run must observe every input, including failed tails');
  let cursor=0,firstFailure=null;const c=group();
  for(const span of run.spans){assert.equal(span.from,cursor);assert.ok(Number.isInteger(span.to)&&span.to>span.from&&span.to<=run.frames);assert.ok(['match','mismatch','unchecked'].includes(span.state));assert.ok(['match','mismatch','unchecked'].includes(span.picture));assert.ok(span.level===null||out.levels[span.level]);
   // Initial verification remains provenance; unknown earlier rows never contaminate later observations.
   const state=span.state,picture=span.picture,n=span.to-span.from;
   if(firstFailure===null&&(state==='mismatch'||picture==='mismatch'))firstFailure=span.from;
   add(out,state,picture,n);add(c,state,picture,n);if(scope?.levels.includes(span.level))add(out.selected,state,picture,n);add(span.level===null?out.unassigned:out.levels[span.level],state,picture,n);cursor=span.to;
  }
  assert.equal(cursor,run.frames);out.runs.push({id:run.id,...c,firstFailure});
 }
 for(const r of inventory)if(!seen.has(r.id)){add(out,'unchecked','unchecked',r.frames);add(out.unassigned,'unchecked','unchecked',r.frames);}
 if(scope)out.outsideSelectedFrames=out.total-out.selected.total;
 assert.equal(out.total,inventory.reduce((n,r)=>n+r.frames,0));for(const c of [out,out.state,out.picture])assert.equal(c.matching+c.notMatching+c.unchecked,c.total);return out;
}

/** Registration accepts one complete source build, never old pictures plus new state. */
export function validateCombinedRegistration(report,inventory,policyHash,{live=false}={}){
 const scope=validateScope(report.scope),expected=live?'running':scope?'scoped-complete':'complete';
 assert.equal(report.progress?.status,expected,live?'Live follow requires a running v2 receipt':'Only a completed audit for the declared scope may be registered');
 if(!live){assert.equal(report.runs.length,inventory.length,'Every inventory recording must be processed');assert.equal(report.errors?.length??0,0,'Audit errors cannot be registered as complete');}
 assert.ok(report.runs.every(r=>r.provenance?.fullPictureStreamAuthenticated&&r.provenance?.sourceVerifiedAfterRun),'Unverified live recording');
 const summary=summarizeCombined(report,inventory,policyHash);if(scope)assert.equal(report.progress.directlyComparedFrames,summary.progress.directlyComparedFrames);return summary;
}

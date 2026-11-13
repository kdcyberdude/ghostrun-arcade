import assert from 'node:assert/strict';import {counting,inventoryHash,summarizeCombined} from './combined-replay.mjs';import {sourceManifestHash} from './source-provenance.mjs';
/** Only complete, individually source/native-stream-verified recordings may enter live totals. */
export function aggregateLiveReports(reports,inventory,{pin,sourceHashes,policyHash,started,status='running',finished=null}){
 const expected=new Map(inventory.map(r=>[r.id,r])),seen=new Set(),runs=[],errors=[],active=[],manifest=sourceManifestHash(sourceHashes);
 for(const report of reports){
  assert.equal(report.schema,'smb-combined-replay-v2');assert.equal(report.counting,counting);assert.equal(report.runtimeCommit,pin);assert.equal(report.inventorySha256,inventoryHash(inventory));assert.equal(report.visualPolicyHash,policyHash);assert.equal(sourceManifestHash(report.sourceHashes),manifest);assert.equal(report.toolSha256,sourceHashes['tools/harness/combined-monitor-audit.ts']);
  errors.push(...(report.errors??[]));active.push(...(report.progress?.active??[]));
  for(const run of report.runs){
   assert.ok(expected.has(run.id));assert.ok(!seen.has(run.id),'Duplicate live recording');seen.add(run.id);assert.equal(run.frames,expected.get(run.id).frames);
   const p=run.provenance;
   const hashes=['ramSha256','initialRamSha256','nativePixelsSha256','nativeEmphasisSha256','observedPixelStreamSha256','observedEmphasisStreamSha256'].every(key=>/^[a-f0-9]{64}$/.test(p?.[key]??''));
   if(!hashes||run.directlyComparedFrames!==run.frames||p?.fullPictureStreamAuthenticated!==true||p.sourceVerifiedAfterRun!==true||p.runtimeCommit!==pin||p.toolManifestSha256!==manifest||p.observedPixelStreamSha256!==p.nativePixelsSha256||p.observedEmphasisStreamSha256!==p.nativeEmphasisSha256){errors.push({id:run.id,error:'Completed recording lacks native stream/source verification; remains unchecked'});continue;}
   runs.push(run);
  }
 }
 const now=new Date().toISOString(),report={schema:'smb-combined-replay-v2',counting,unit:'input-frame',protocol:'continuous-from-recorded-start',runtimeCommit:pin,inventorySha256:inventoryHash(inventory),visualPolicyHash:policyHash,sourceHashes,toolSha256:sourceHashes['tools/harness/combined-monitor-audit.ts'],runs,errors,progress:{status,started,updated:now,finished,active,done:runs.length,total:inventory.length,directlyComparedFrames:runs.reduce((n,r)=>n+r.frames,0)}};
 return {report,summary:summarizeCombined(report,inventory,policyHash)};
}

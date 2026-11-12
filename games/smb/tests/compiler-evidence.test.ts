import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {restoreCompilerEvidence} from '../tools/restore-compiler-evidence.mjs';
import accepted from '../data/firebar-5-4-production.json';
import manifest from '../data/compiler-evidence-manifest.json';
const sha=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');

test('bundled original compiler evidence restores the exact accepted firebar proof and source closure',()=>{
 const target=fs.mkdtempSync(path.join(os.tmpdir(),'smb-compiler-evidence-'));
 try{
  assert.equal(restoreCompilerEvidence(target),manifest.files.length);
  for(const file of manifest.files)assert.equal(sha(fs.readFileSync(path.join(target,file.path))),file.sha256,file.path);
  const reportPath=path.join(target,accepted.validation.file),{date,...report}=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  assert.equal(sha(JSON.stringify(report)),accepted.validation.sha256ExcludingOnlyTopLevelDate);
  assert.equal(report.reports.length,7);assert.ok(report.reports.every((r:{raw2pxPassed:boolean})=>r.raw2pxPassed===false),'raw-image failures remain failures');
  assert.equal(sha(fs.readFileSync(path.join(target,accepted.validation.dateOnlyRerunAttestation.file))),accepted.validation.dateOnlyRerunAttestation.sha256);
  assert.equal(sha(fs.readFileSync(path.join(target,accepted.validation.beforeReport))),accepted.validation.beforeReportSha256);
  const attestation=JSON.parse(fs.readFileSync(path.join(target,accepted.validation.dateOnlyRerunAttestation.file),'utf8'));
  assert.equal(sha(fs.readFileSync(path.join(target,attestation.original.path))),accepted.validation.originalProposalReportSha256);
  const rerun=JSON.stringify({date:'2026-11-13T00:00:00.000Z',...report});fs.writeFileSync(reportPath,rerun);
  assert.equal(restoreCompilerEvidence(target),0);assert.equal(fs.readFileSync(reportPath,'utf8'),rerun,'restore preserves existing evidence and the compiler owns its acceptance checks');
 }finally{fs.rmSync(target,{recursive:true,force:true});}
});

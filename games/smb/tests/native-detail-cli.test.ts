import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import zlib from 'node:zlib';import {execFileSync} from 'node:child_process';
import fixture from './fixtures/native-flag-runtime.json';import {decodeEntrance} from '../tools/harness/native-entrance.mjs';import {compareRun} from '../tools/harness/native-divergence.js';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),c=fixture.cases.find(c=>c.level==='1-1')!;
function runDetail(ramFrames:number){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'smb-native-detail-'));
 try{
  const dir=path.join(temp,'1-1');fs.mkdirSync(dir);const initial=unpack(c.initial),pads=unpack(c.pads).subarray(0,3),ram=unpack(c.ram).subarray(0,ramFrames*2048);
  fs.writeFileSync(path.join(dir,'initial.ram'),initial);fs.writeFileSync(path.join(dir,'pads.bin'),pads);fs.writeFileSync(path.join(dir,'ram.bin'),ram);fs.writeFileSync(path.join(dir,'entrance.json'),JSON.stringify(c.receipt));
  const report=path.join(temp,'report.json'),stdout=execFileSync('npx',['tsx','tools/harness/native-divergence.ts','--traces',temp,'--entrances',temp,'--levels','1-1','--detail','--json',report],{encoding:'utf8'});
  return {stdout,report:JSON.parse(fs.readFileSync(report,'utf8'))[0],legacy:compareRun(decodeEntrance(initial,c.receipt),pads,f=>ram.subarray(f*2048,(f+1)*2048),'1-1',true)};
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
test('CLI --detail includes all strict fields and full-input counts without a separate --strict flag',()=>{
 const {stdout,report,legacy}=runDetail(3);assert.ok(report.strict);assert.equal(report.strict.coverage.inputFrames,3);assert.equal(report.strict.coverage.frames,3);assert.equal(report.strict.coverage.unsteppedFrames,0);assert.equal(report.strict.coverage.completeInputSequence,true);
 assert.match(stdout,/strictFields=.*missing/);assert.match(stdout,/input=3 ram=3 stepped=3 unstepped=0/);assert.match(stdout,/completeInput=true/);assert.equal(Object.hasOwn(legacy,'strict'),false,'programmatic legacy API remains unchanged');assert.deepEqual(report.fields,legacy.fields);
});
test('CLI --detail exposes unpaired input/RAM rows instead of a complete-input pass',()=>{
 const {stdout,report}=runDetail(2);assert.equal(report.strict.coverage.unsteppedFrames,1);assert.equal(report.strict.coverage.completeInputSequence,false);assert.notEqual(report.strict.status,'pass');assert.ok(report.strict.diagnostics.some((g:{code:string})=>g.code==='input-ram-length-mismatch'));assert.match(stdout,/unstepped=1/);assert.match(stdout,/completeInput=false/);
});

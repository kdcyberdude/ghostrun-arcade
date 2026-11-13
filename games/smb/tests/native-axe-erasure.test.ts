import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {auditVictory} from '../tools/harness/native-victory-audit.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/native-axe-erasure.json',import.meta.url),'utf8'));
for(const run of fixture.runs)test(`${run.name}: native right-foot axe erasure and every victory/load state row`,()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'smb-axe-'));
 try{
  const initial=Buffer.from(run.initial,'base64'),pads=Buffer.from(run.pads,'base64'),ram=gunzipSync(Buffer.from(run.ram,'base64'));
  for(const [key,bytes]of Object.entries({initial,pads,ram}))assert.equal(createHash('sha256').update(bytes).digest('hex'),run.hashes[key],`${key} source hash`);
  const r=ram.subarray(run.touch.frame*2048,(run.touch.frame+1)*2048);
  assert.equal(r[6]+r[7]*256+r[2],run.touch.pointer);
  assert.equal(r[run.touch.axe],run.touch.remaining);
  if(run.name==='original-v2'){
   assert.deepEqual(run.touch,{frame:1978,axe:0x56d,pointer:0x56e,remaining:0xc5});
   assert.equal(ram[2105*2048+0x772],0,'native legitimately touches the retained axe again');
   assert.equal(ram[2105*2048+0x56d],0xc5);
  }else assert.equal(run.touch.pointer,run.touch.axe,'right foot erases the axe itself');
  const traces=path.join(root,'traces'),receipts=path.join(root,'receipts');
  fs.mkdirSync(path.join(traces,'1-4'),{recursive:true});fs.mkdirSync(path.join(receipts,'1-4'),{recursive:true});
  for(const [file,bytes]of Object.entries({'initial.ram':initial,'pads.bin':pads,'ram.bin':ram}))fs.writeFileSync(path.join(traces,'1-4',file),bytes);
  fs.writeFileSync(path.join(receipts,'1-4/entrance.json'),JSON.stringify(run.receipt));
  const report=auditVictory(traces,receipts,'1-4');
  assert.equal(report.status,'pass',JSON.stringify(report));
  assert.equal(report.first,null);assert.deepEqual(report.gaps,[]);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

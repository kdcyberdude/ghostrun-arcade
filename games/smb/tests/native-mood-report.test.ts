import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodeEntrance} from '../tools/harness/native-entrance.mjs';
import {strictCompare} from '../tools/harness/native-strict.js';
import {moodCorpusReport} from '../tools/harness/native-mood-report.js';
import fixture from './fixtures/native-load-prefix-cases.json';
import familyFixture from './fixtures/native-mood-report-prefix.json';

function prefixReport(level:string,area:string){
 const c=[...fixture.cases,...familyFixture.cases].find(c=>c.level===level&&c.binding.area===area)!,unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64')));
 const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),strict=strictCompare(decodeEntrance(initial,{level},c.binding),pads,ram,level);
 for(const [bytes,expected]of [[initial,c.initialRamSha256],[pads,c.padsSha256],[ram,c.ramSha256]] as const)assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
 const cache=fs.mkdtempSync(path.join(os.tmpdir(),'smb-mood-prefix-report-')),sha='native-prefix-fixture',dir=path.join(cache,'captures',sha),frames=pads.length+1;
 try{
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'ram.bin'),Buffer.concat([initial,ram]));
  fs.writeFileSync(path.join(cache,'inventory.json'),JSON.stringify({files:1,unique:1,frames,runs:[{sha256:sha,frames,provenance:[{pads:"native-prefix-fixture.pads.bin"}]}]}));
  fs.writeFileSync(path.join(dir,'audit.json'),JSON.stringify({runtimeCommit:'fixture',auditToolSha256:'fixture',coverage:{comparedFrames:pads.length},native:{deaths:0,spans:[]},entries:[{index:0,level,areaBindings:[c.binding],loadFrame:0,endFrame:frames,diagnostics:['recording ends in native load prefix'],controlPrefix:{initialFrame:0,sourceFrameOffset:1,endFrame:frames,strict,traceDirectory:'prefix-trace',receiptDirectory:'prefix-receipt'}}]}));
  return {strict,report:moodCorpusReport(cache,'fixture')};
 }finally{fs.rmSync(cache,{recursive:true,force:true});}
}

test('corpus groups actual missing load-prefix actors even when no gameplay entry exists',()=>{
 const {strict,report}=prefixReport('1-2','area-3');assert.notEqual(strict.fields.missing,null);
 const group=report.clusters.find(c=>c.scope==='control-prefix'&&c.field==='missing');assert.ok(group);assert.equal(group.level,'1-2');assert.equal(group.area,'area-3');assert.equal(group.count,1);
 assert.equal(group.examples[0].sourceFrame,1+strict.fields.missing!);assert.equal(group.examples[0].traceDirectory,'prefix-trace');assert.equal(group.examples[0].receiptDirectory,'prefix-receipt');
 assert.equal(report.coverage.initializedEntries,0);assert.equal(report.coverage.initializedControlPrefixes,1);assert.equal(report.coverage.fullyVerifiedAllFieldAndPixelFrames,0);
});

test('unsupported native prefix families are grouped separately from field mismatches',()=>{
 const {strict,report}=prefixReport('1-4','main');assert.equal(Object.values(strict.fields).every(v=>v===null),true);
 const group=report.coverageGaps.find(g=>g.scope==='control-prefix'&&g.code==='unsupported-sim-object-family'&&g.kind==='firebar');assert.ok(group);assert.equal(group.count,1);assert.ok(group.frames>0);
 assert.equal(report.clusters.length,0);assert.equal(report.coverage.status,'incomplete');
});

/** Source PlayerHole + UpdScrollVar proof and all46 continuous World1-1 load-alias cases.
 * npx tsx tools/harness/native-player-hole-events.mjs --catalog CATALOG --captures DIR --rom ROM --proof BINARY --out FILE
 * Controlled ROM calls are procedure proof; retained inputs replay from cold start without model reseeds. */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{catalog:{type:'string'},captures:{type:'string'},rom:{type:'string'},proof:{type:'string'},out:{type:'string'}}});if(!a.catalog||!a.captures||!a.rom||!a.proof||!a.out)throw Error('all arguments required');
const hash=b=>createHash('sha256').update(b).digest('hex'),catalog=JSON.parse(fs.readFileSync(a.catalog)),rom=fs.readFileSync(a.rom);assert.equal(hash(rom),'f61548fdf1670cffefcc4f0b7bdcdd9eaba0c226e3b74f8666071496988248de');
const selected=catalog.runs.filter(r=>r.fields.includes('load.scrollLocked')&&r.fields.every(f=>['load.scrollLocked','load.parserColumn'].includes(f)));assert.equal(selected.length,46);
const aliases=r=>({task:r[0x71f],scroll:r[0x73d],column:r[0x725]*256+r[0x726]*16,locked:r[0x723]}),inputs=[],runs=[];
for(let yHigh=0;yHigh<256;yHigh++)for(const locked of [0,7]){const ram=Buffer.alloc(2048);ram[0xb5]=yHigh;ram[0x723]=locked;inputs.push({kind:0,ram,before:{yHigh,locked}});}
for(const old of selected){
 const sha=old.id.slice(5),dir=path.join(a.captures,sha),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),initial=fs.readFileSync(path.join(dir,'initial.ram')),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json')));assert.equal(hash(ram),capture.ramSha256);assert.equal(hash(pads),sha);assert.equal(hash(initial),capture.initialRamSha256);
 const end=old.firstState+3,rows=[];let previous=initial;
 for(let frame=0;frame<end;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048),before=aliases(previous),after=aliases(r),changed=JSON.stringify(before)!==JSON.stringify(after),body=r[0x770]===1&&r[0x772]===3&&(r[14]===11||r[0xb5]>=2);
  if(body&&changed||frame>=old.firstState-2)rows.push({frame,engine:r[14],modeTask:r[0x772],yHigh:r[0xb5],...after});
  if(r[0x770]===1&&r[0x772]===3&&r[14]===11&&previous[14]===11&&(before.task!==after.task||before.column!==after.column||before.scroll!==after.scroll)){
   const input=Buffer.from(previous);input[0x773]=0; // NMI consumes the prior buffer2 controller before GameEngine's tail.
   inputs.push({kind:1,ram:input,id:old.id,frame,before,expected:after,nativeBeforeSha256:hash(previous),nativeAfterSha256:hash(r)});
  }
  previous=r;
 }
 runs.push({id:old.id,oldFirst:old.firstState,initial:initial.toString('base64'),initialSha256:hash(initial),pads:pads.subarray(0,end).toString('base64'),inputSha256:hash(pads.subarray(0,end)),sourceRamSha256:capture.ramSha256,rows});
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'smb-hole-proof-'));let hole=[],parser=[];
try{
 const input=path.join(temp,'input.bin'),output=path.join(temp,'output.bin');fs.writeFileSync(input,Buffer.concat(inputs.map(n=>Buffer.concat([Buffer.from([n.kind]),n.ram]))));const result=spawnSync(a.proof,[a.rom,input,output],{encoding:'utf8'});if(result.error)throw result.error;assert.equal(result.status,0,result.stderr);const bytes=fs.readFileSync(output);assert.equal(bytes.length,inputs.length*2048);
 for(const [index,n]of inputs.entries()){const r=bytes.subarray(index*2048,(index+1)*2048);if(n.kind===0)hole.push({...n.before,after:r[0x723]});else{const after=aliases(r);assert.deepEqual(after,n.expected,`${n.id} source${n.frame}: actual ROM tail vs captured native row`);parser.push({id:n.id,frame:n.frame,before:n.before,after,nativeBeforeSha256:n.nativeBeforeSha256,nativeAfterSha256:n.nativeAfterSha256});}}
}finally{fs.rmSync(temp,{recursive:true,force:true});}
fs.writeFileSync(a.out,JSON.stringify({source:'Actual PRG0 PlayerHole guard and full UpdScrollVar procedure calls, plus46 authenticated continuous cold-start World1-1 prefixes; no model native-state injection',romSha256:hash(rom),proofSourceSha256:hash(fs.readFileSync(new URL('./native-player-hole-proof.cpp',import.meta.url))),proofBinarySha256:hash(fs.readFileSync(a.proof)),catalogSha256:hash(fs.readFileSync(a.catalog)),hole,parser,runs})+'\n');console.log(hole.length,'ROM PlayerHole cases;',parser.length,'ROM parser-tail/captured row matches;',runs.length,'continuous prefixes');

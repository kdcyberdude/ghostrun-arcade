/** Retain all independent World1-1 misc-coin episodes from a diagnostic catalog.
 * npx tsx tools/harness/native-one-one-misc-death-events.mjs --entries entries.jsonl --out tests/fixtures/native-one-one-misc-death.json
 * Native snapshots are diagnostic seeds, never continuous POWER-ON proof. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{entries:{type:'string'},out:{type:'string'}}});if(!a.entries||!a.out)throw Error('--entries and --out required');
const hash=b=>createHash('sha256').update(b).digest('hex'),runs=[];
for(const line of fs.readFileSync(a.entries,'utf8').trim().split('\n')){
 const capture=JSON.parse(line),selected=capture.entries.filter(e=>e.diagnostic?.first?.cluster?.entity==='coin');if(!selected.length)continue;
 const ram=fs.readFileSync(path.join(capture.sourceDirectory,'ram.bin')),pads=fs.readFileSync(path.join(capture.sourceDirectory,'pads.bin'));
 assert.equal(hash(ram),capture.capture.ramSha256);assert.equal(hash(pads),capture.sha256);
 for(const e of selected){
  const d=e.diagnostic,start=d.sourceFrameOffset,end=d.endFrame,initial=ram.subarray((start-1)*2048,start*2048),input=pads.subarray(start,end),bytes=ram.subarray(start*2048,end*2048),rows=[];
  assert.equal(hash(initial),d.initialRamSha256);assert.equal(hash(input),d.inputSha256);assert.equal(hash(bytes),d.ramSha256);let previous=false;
  for(let frame=0;frame<input.length;frame++){
   const r=bytes.subarray(frame*2048,(frame+1)*2048);assert.equal(r[0x75f],0);assert.equal(r[0x75c],0);
   const coins=[];for(let slot=8;slot>=0;slot--){const state=r[0x2a+slot];if(state&&state<128)coins.push([slot,state,r[0x7a+slot]*256+r[0x93+slot],(r[0xc2+slot]-1)*256+r[0xdb+slot],(r[0xac+slot]<<24)>>24,r[0x440+slot],r[0x423+slot]]);}
   if(coins.length||previous||frame===0)rows.push({frame,engine:r[14],master:r[0x747],coins});previous=coins.length>0;
  }
  runs.push({sha256:capture.sha256,entry:e.index,sourceFrameOffset:start,role:'DIAGNOSTIC native entrance seed; NOT continuous POWER-ON proof',initialSha256:hash(initial),inputSha256:hash(input),ramSha256:hash(bytes),initial:initial.toString('base64'),pads:input.toString('base64'),receipt:e.receipt,rows});
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Unmodified authenticated World1-1 native RAM, every misc-coin slot on every live/erase row in all independent diagnostic coin clusters',runs})+'\n');console.log(runs.length,'native diagnostic episodes',runs.reduce((n,r)=>n+r.rows.length,0),'misc bank rows');

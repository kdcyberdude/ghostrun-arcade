import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import fixture from './fixtures/native-startup-controls.json';
const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('native POWER-ON prefixes preserve genuine cold RAM and varied source Start/select phases through first World1-1 control',()=>{
 assert.equal(fixture.cases.length,7);const starts:Record<string,number|null>={start40:40,start80:80,'select40-start80':80,'a-start50':50,'b-start40-start80':80,'held-start0':null,'held-start0-release-start120':120},latencies=new Set<number>();let frames=0;
 for(const c of fixture.cases){
  const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(initial.length,2048);assert.ok(initial.every(v=>v===255));assert.equal(hash(initial),c.receipt.initialRamSha256);assert.equal(hash(pads),c.segmentPadsSha256);assert.equal(hash(ram),c.segmentRamSha256);assert.equal(ram.length,pads.length*2048);assert.equal(c.rows.length,pads.length);frames+=pads.length;
  for(const row of c.rows){const r=ram.subarray(row.frame*2048,(row.frame+1)*2048);assert.deepEqual([row.mode,row.task,row.engine,row.screen,row.disable,row.counter,row.interval],[r[0x770],r[0x772],r[14],r[0x73c],r[0x774],r[9],r[0x77f]]);assert.deepEqual(row.random,Array.from(r.subarray(0x7a7,0x7ae)));}
  const started=c.rows.find(row=>row.mode===1)?.frame??null;assert.equal(started,starts[c.name],c.name);
  if(started===null){assert.equal(c.receipt.firstPlayerRdy,null);assert.ok(c.rows.slice(7).every(row=>row.mode===0));}
  else{assert.ok(c.receipt.firstPlayerRdy!==null);latencies.add(c.receipt.firstPlayerRdy!-started);const ready=c.rows[c.receipt.firstPlayerRdy!];assert.deepEqual([ready.mode,ready.task,ready.engine],[1,3,8]);}
  if(c.name==='select40-start80')assert.equal(c.rows[40].players,1);
 }
 assert.equal(frames,1533);assert.ok(latencies.size>1,'native screen completion follows interval phase, not a fixed Start-to-ready duration');
});

import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {decodeNativeLoad} from '../tools/harness/native-load-seed.mjs';import {decodeEntrance} from '../tools/harness/native-entrance.mjs';import {strictCompare} from '../tools/harness/native-strict.js';import fixture from './fixtures/native-load-prefix-cases.json';import {auditNativeLoadPrefix} from '../tools/harness/native-mood-load-prefix.js';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('authentic load prefixes compare all source controls, NMI clocks, HUD and coordinates before gameplay begins',()=>{
 let rows=0;for(const c of fixture.cases){const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(hash(initial),c.initialRamSha256);assert.equal(hash(pads),c.padsSha256);assert.equal(hash(ram),c.ramSha256);
  const start=decodeEntrance(initial,{level:c.level},c.binding),audit=strictCompare(start,pads,ram,c.level);assert.ok(start.nativeLoad);assert.equal(start.nativeWater,undefined,'water gameplay motor is not initialized from screen-loader aliases');assert.equal(audit.coverage.frames,pads.length);
  for(const [field,first]of Object.entries(audit.fields))if(field.startsWith('prefix.')||['x','y','cam','time','score','coins','level','area'].includes(field))assert.equal(first,null,`${c.level} entry${c.entry} ${field}`);
  rows+=audit.coverage.frames;if(c.entry===7){assert.equal(c.level,'1-3');assert.equal(pads.length,156);assert.equal(audit.status,'pass','truncated epoch never requires a later gameplay pose');}
 }
 assert.equal(rows,723);
});
test('native intermediate-screen gate uses AltEntranceControl, AreaType and DisableIntermediate',()=>{
 const r=unpack(fixture.cases[0].initial);r[0x752]=1;r[0x769]=0;assert.equal(decodeNativeLoad(r)!.skipIntermediate,true);
 r[0x752]=0;r[0x74e]=3;r[0x769]=1;assert.equal(decodeNativeLoad(r)!.skipIntermediate,false);r[0x74e]=1;assert.equal(decodeNativeLoad(r)!.skipIntermediate,true);
 r[0x770]=0;assert.equal(decodeNativeLoad(r),undefined);r[0x770]=1;r[0x772]=3;r[14]=8;assert.equal(decodeNativeLoad(r),undefined,'live gameplay keeps the existing entrance contract');
});
test('altered final native prefix control byte is compared and cannot receive a clean pass',()=>{
 const c=fixture.cases[7],initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),start=decodeEntrance(initial,{level:c.level},c.binding);ram[(pads.length-1)*2048+0x71e]^=1;
 const audit=strictCompare(start,pads,ram,c.level);assert.equal(audit.fields['prefix.load.columns'],pads.length-1);assert.equal(audit.status,'diverged');
});

test('truncated load-only epochs retain an explicit independent prefix instead of requiring a later gameplay seed',()=>{
 const c=fixture.cases[7],initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),whole=new Uint8Array(initial.length+ram.length),input=new Uint8Array(pads.length+1);whole.set(initial);whole.set(ram,2048);input.set(pads,1);
 const entry={loadFrame:0,endFrame:input.length,level:c.level,areaBindings:[c.binding]},prefix=auditNativeLoadPrefix(whole,input,entry)!;
 assert.equal(prefix.initialFrame,0);assert.equal(prefix.sourceFrameOffset,1);assert.equal(prefix.endFrame,input.length);assert.equal(prefix.initialRamSha256,c.initialRamSha256);assert.equal(prefix.padsSha256,c.padsSha256);assert.equal(prefix.ramSha256,c.ramSha256);assert.equal(prefix.strict.coverage.frames,156);assert.equal(prefix.strict.status,'pass');
 assert.equal(auditNativeLoadPrefix(whole,input,{...entry,areaBindings:[c.binding,c.binding]}),undefined,'ambiguous source binding is not fitted');
});

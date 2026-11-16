import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';
import {nativeNmiTiming,nativeSoundEngine} from '../src/native-nmi-timing.js';
import fixture from './fixtures/native-nmi-timing.json';import validation from '../data/native-nmi-timing-validation.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));

test('the NMI timing and SoundEngine models equal the cycle-counting CPU replays of the fixture rows',()=>{
 for(const c of fixture.cases){const row=unpack(c.ram),at=`${c.id} row ${c.frame}`;
  assert.deepEqual(nativeNmiTiming(row,c.pad),{en:c.en,clr:c.clr,hit:c.hit},at);
  const ram=new Uint8Array(row);assert.equal(nativeSoundEngine(ram),c.sound,at);
  assert.equal(Buffer.from(fixture.soundAddresses.map(a=>ram[a])).toString('hex'),c.soundRam,at);}
 assert.ok(fixture.cases.length>500);
});

test('the full measurement over every gameplay row of the power-on captures has no mismatch',()=>{
 assert.equal(validation.mismatches,0);assert.ok(validation.recordings>=539&&validation.rows>10_000_000);
});

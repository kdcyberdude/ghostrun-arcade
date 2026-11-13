import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import levels from '../data/levels.json';import {applyNativeWaterCoins} from '../src/native-water-coins.js';import type {Level} from '../src/types.js';import sample from './fixtures/native-water-coin-case.json';import {bufferValue} from '../tools/harness/native-level-map.js';
test('native RowOfCoins projects the source row before Mario reaches the third coin',()=>{
 const ram=zlib.gunzipSync(Buffer.from(sample.ram,'base64'));assert.equal(createHash('sha256').update(ram).digest('hex'),sample.ramSha256);
 assert.equal(ram[0xe7]+ram[0xe8]*256,0xae47);
 const projected=applyNativeWaterCoins(levels as unknown as Level[]),area=projected.find(l=>l.id==='2-2')!.areas.find(a=>a.id==='area-2')!,tiles=new Map(area.tiles.map(t=>[`${t[0]},${t[1]}`,t[2]]));
 for(const col of [113,114,115])for(const row of [6,7]){
  const address=0x500+((col>>4)&1)*0xd0+(row-2)*16+(col&15);assert.equal(bufferValue(tiles.get(`${col},${row}`)??0),ram[address]);
 }
 const pixels=zlib.gunzipSync(Buffer.from(sample.picture.indices,'base64')),w=sample.picture.crop.width;
 // Actual PPU shows the three coins on one row; the empty row beneath the final coin is water.
 for(const col of [113,114,115]){
  const x=col*16-sample.picture.crop.x;assert.ok(Array.from(pixels.subarray(24*w+x,24*w+x+16)).some(p=>p!==0x12));
  assert.ok(Array.from(pixels.subarray(40*w+x,40*w+x+16)).every(p=>p===0x12));
 }
});

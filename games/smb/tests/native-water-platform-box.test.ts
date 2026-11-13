import {test} from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {nativePlatformSide} from '../src/native-platform-contact.js';
import cases from './fixtures/native-platform-hard-width-cases.json';

test('native water platform side contact reads the cached pre-BG box before late whirlpool gravity',()=>{
 const c=cases.find(c=>c.level==='5-2')!,r=zlib.gunzipSync(Buffer.from(c.initial,'base64')),camera=r[0x71a]*256+r[0x71c],small=r[0x756]===0,big=!small&&!r[0x714];
 const player=Array.from(r.subarray(0x4ac,0x4b0)),offset=0x4ac+(c.slot+1)*4,platform=Array.from(r.subarray(offset,offset+4));
 const x=player[0]+camera-(small?3:2),feet=player[3],prior={x:platform[0]+camera,y:platform[1]},speed=(r[0x9f]<<24)>>24;
 assert.deepEqual(player,[83,75,93,87]);assert.deepEqual(platform,[38,61,86,74]);
 assert.equal(nativePlatformSide(feet,speed,big,x,prior,c.width,!small),0);
 // ProcessWhirlpools has moved the stored player one row upward by the retained RAM sample.
 // Using that later pose would spuriously push Mario right after the genuine BG back-out.
 const laterX=r[0x6d]*256+r[0x86],laterFeet=r[0xce]+32;
 assert.equal(nativePlatformSide(laterFeet,speed,big,laterX,prior,c.width,!small),-1);
});

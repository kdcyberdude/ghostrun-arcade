import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeFirebarHit} from '../src/firebar-contact.js';

// Actual OAM flame quads ($0200), Mario's preceding sprite-1 x, $CE and camera ($071A/$071C) from the v2 traces.
for(const sample of [
 {level:'1-4',frame:540,camera:1109,feet:142,marioScreenX:114,flames:[[111,148],[118,145],[125,142],[133,139],[140,136],[148,133]],hit:false},
 {level:'1-4',frame:541,camera:1111,feet:144,marioScreenX:114,flames:[[109,148],[116,145],[123,142],[131,139],[138,136],[146,133]],hit:true},
 {level:'6-4',frame:261,camera:441,feet:99,marioScreenX:112,flames:[[155,100],[147,100],[139,100],[131,100],[123,100],[115,100]],hit:false},
 {level:'6-4',frame:262,camera:444,feet:102,marioScreenX:112,flames:[[152,100],[144,100],[136,100],[128,100],[120,100],[112,100]],hit:true},
])test(`native firebar contact ${sample.level} row ${sample.frame}`,()=>{
 const hit=sample.flames.some(([x,y])=>nativeFirebarHit({x:x+sample.camera+4,y:y+5},sample.camera,sample.marioScreenX,sample.feet,false));
 assert.equal(hit,sample.hit);
});

test('native big-Mario probes use feet-32, feet-20 and feet-8; flames at x>=240 cannot hurt',()=>{
 assert.equal(nativeFirebarHit({x:104,y:117},0,96,132,true),true,'the middle big-Mario probe is at y112');
 assert.equal(nativeFirebarHit({x:244,y:117},0,236,132,true),false,'the native right-edge cutoff is sprite x240');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeSpecialSlot,nativeControlColumn} from '../src/native-special-slot.js';
import {decodeAreaControls} from '../tools/harness/native-area-controls.js';
import controls from '../data/native-area-controls.json';
import {nativeAboveCoinStart,nativeMiscGravity} from '../src/native-misc.js';
import events from './fixtures/native-enemy-rule-events.json';
import vines from './fixtures/native-vine-slots.json';
import duplicateVines from './fixtures/native-vine-duplicate-slots.json';

test('native reserved-slot flag claims match every retained flagpole birth',()=>{
 assert.equal(events.specialFlagBirths.length,19);
 for(const e of events.specialFlagBirths){const n=new NativeSpecialSlot();n.flag=e.beforeFlag;n.claimFlag(e.column);assert.deepEqual([n.flag,n.id,n.x,n.y],[e.flag,e.id,e.x,e.y],`${e.level} row ${e.row}`);}
});
test('native AreaFrenzy can claim reserved slot5 when all ordinary slots are occupied',()=>{
 for(const e of events.specialQueueRows){const n=new NativeSpecialSlot();n.frenzyQueue=e.queue;assert.deepEqual(n.consumeFrenzy(e.slot),{id:e.queue,slot:e.slot});assert.equal(n.frenzyBuffer,e.buffer);if(e.slot===5)assert.deepEqual([n.flag,n.id],[e.flag,e.id]);}
 const n=new NativeSpecialSlot();n.claimFlag(3200);n.areaCommand(23,[]);assert.equal(n.consumeFrenzy(6),undefined);assert.equal(n.frenzyQueue,23);
 n.areaCommand(23,[7,23,11]);assert.equal(n.frenzyQueue,0);
});
test('native vine growth, limits and offscreen erasure match controlled native engine branches',()=>{
 for(const e of vines.rows){const n=new NativeSpecialSlot();Object.assign(n,e.before);n.stepVine(e.frame,e.camera);for(const k of Object.keys(e.after) as (keyof typeof e.after)[])assert.equal(n[k],e.after[k],`${e.case} row ${e.row} ${k}`);}
});
test('CheckFrenzyBuffer allocates a second vine sprite segment in an ordinary slot',()=>{
 for(const e of duplicateVines.rows){const n=new NativeSpecialSlot();Object.assign(n,e.before);if('duplicateSlot' in e)n.addVineSegment(e.duplicateSlot!);n.stepVine(e.frame,e.camera);for(const k of Object.keys(e.after) as (keyof typeof e.after)[])assert.equal(n[k],e.after[k],`${e.case} row ${e.row} ${k}`);}
});
test('a powerup or vine replaces the prior slot5 owner; FlagpoleObject increments its existing flag',()=>{
 const n=new NativeSpecialSlot();n.claimPowerup(128,136);assert.deepEqual([n.flag,n.id],[1,46]);n.claimVine(160,144);assert.deepEqual([n.flag,n.id,n.vineCount],[1,47,1]);n.claimFlag(3200);assert.deepEqual([n.flag,n.id],[2,48]);n.claimPowerup(192,136);assert.deepEqual([n.flag,n.id],[1,46]);
});
test('ROM control decoder reads native page selection and flag/frenzy object identifiers',()=>{
 const rom=new Uint8Array(64).fill(0xfd);rom.set([0x0d,3,0x4d,0x48,0x8d,0xc9,0xbd,0x4a,0xed,0x41,0xfd],16);
 assert.deepEqual(decodeAreaControls(rom,0x8000),[{x:832,id:20},{x:1152,id:23},{x:1200,id:24},{x:1248,id:48}]);
 assert.equal(nativeControlColumn(2048,0),2400);assert.equal(nativeControlColumn(2048,4),2416);assert.equal(nativeControlColumn(2048,1),undefined);
});
test('native ROM flag command columns match every retained flag birth through the source geometry offset',()=>{
 for(const e of events.specialFlagBirths)assert.ok(controls.areas.filter(a=>a.level===e.level).some(a=>a.commands.some(c=>c.id===48&&a.source.some(s=>c.x-s.offset*16===e.column))),`${e.level} row ${e.row}`);
});
test('above-block jumping coins retain ASL carry from the native block-buffer page',()=>{
 assert.deepEqual(nativeAboveCoinStart(96,0xdb,3),{x:949,y:129});assert.deepEqual(nativeAboveCoinStart(96,11,2),{x:693,y:128});
 assert.ok(events.aboveBlockCoins.length>0);
 for(const e of events.aboveBlockCoins){const start=nativeAboveCoinStart(e.bufferRow,e.bufferLow,e.blockPage),n={slot:e.slot,state:1,speed:-5,...e.before};const y=nativeMiscGravity(n,start.y,80,6);assert.deepEqual([start.x,y,n.speed,n.force,n.fraction],[e.after.x,e.after.y,e.after.speed,e.after.force,e.after.fraction]);}
});

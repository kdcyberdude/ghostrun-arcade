import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {NativeMotor} from '../src/native-motor.js';
import {observedLevels} from '../src/levels.js';
import native from '../evidence/entry-timeline-native-rows-20261109.json';
import winningInputs from '../data/observed-winning-inputs.json';
import type {Button} from '../src/types.js';
import {nativeEntrySequence} from './helpers/native-entry-sequence.js';
import {strictNativeEntities,strictEntityDifferences} from '../tools/harness/native-strict-entities.js';

// Native rows (tools/fidelity-lab/native-trace.mjs, recorded winning route): row i is the state after i+1 frames. Timeline state (phase,
// automatic walk, pipe entry, entry fall) pairs remake step f with native row f; input-driven state pairs it with row f-1 because the
// remake has one more frame of input latency (a two-step input queue against the native single frame).
const keys:Button[]=['up','down','left','right','a','b'];
const frameInputs:Button[][]=[];
for(const [mask,frames] of winningInputs.actions as number[][])for(let f=0;f<frames;f++)frameInputs.push(keys.filter((_,bit)=>mask&(1<<bit)));

const nativeAt=(level:typeof native.levels[number],field:'x'|'y'|'vx',row:number)=>level[field][row-level.fromRow];
// The old cold-reset/nextLevel setup assumed a165-row screen interval without
// retaining the native077F phase. These tests instead seed actual v2 RAM once.
// Archived slice-clock observations remain above and in the motor/camera tests.
for(const level of ['1-2','2-2','4-2','7-2']){
 const run=nativeEntrySequence(level);
 test(`${level}: source area-load tasks replace a fixed intro duration`,()=>{
  let loading=0;for(const {frame,r,actual:a}of run.rows)if(r[0x772]<3){loading++;assert.equal(a.phase,'intro',`frame${frame}`);assert.ok(a.screen);assert.deepEqual([a.screen.task,a.screen.engine,a.screen.screen,a.screen.disable,a.screen.timer,a.screen.columns],[r[0x772],r[14],r[0x73c],r[0x774],r[0x7a0],r[0x71e]],`frame${frame}`);}assert.ok(loading>20);
 });
 test(`${level}: every native automatic-walk and pipe-motor row retains source x/y/speed bytes`,()=>{
  let movement=0;for(const {frame,r,actual:a}of run.rows){if(r[0x772]!==3||![7,8].includes(r[14]))continue;movement++;assert.equal(a.x,r[0x6d]*256+r[0x86],`frame${frame} x`);assert.equal(a.y,(r[0xb5]-1)*256+r[0xce],`frame${frame} y`);assert.equal(a.vx,((r[0x57]<<24)>>24)*256+r[0x705],`frame${frame} speed`);}assert.ok(movement>350);
 });
 test(`${level}: secondary-room entry fall and PlayerRdy follow native controls`,()=>{
  let entry=0,controlled=0;for(const {frame,r,actual:a}of run.rows)if(a.area!==run.main&&r[0x772]===3&&[7,8].includes(r[14])){entry++;assert.equal(a.locked,r[14]===7,`frame${frame} control`);assert.equal(a.y,(r[0xb5]-1)*256+r[0xce],`frame${frame} y`);if(r[14]===8)controlled++;}assert.ok(entry>80);assert.equal(controlled,81);
 });
 test(`${level}: room HUD timer and first live enemies retain source rows`,()=>{
  let checked=0;for(const {frame,r,actual:a}of run.rows)if(a.area!==run.main&&r[0x772]===3&&[7,8].includes(r[14])){checked++;assert.equal(a.time,r[0x7f8]*100+r[0x7f9]*10+r[0x7fa],`frame${frame} HUD`);assert.equal(a.gameTimer,r[0x787],`frame${frame} timer phase`);assert.deepEqual(strictEntityDifferences(strictNativeEntities(r),a.actors).mismatches,[],`frame${frame} enemies`);}assert.ok(checked>80);
 });
}

test('the walk motor with the automatic-walk cap reproduces the native speed bytes from rest',()=>{
 const level=native.levels.find(l=>l.id==='1-2')!;
 const motor=new NativeMotor();motor.capByte=12;
 for(let row=level.appearRow+1;row<=level.appearRow+60;row++){
  assert.equal(motor.speed=motor.groundPress(1,false),nativeAt(level,'vx',row),`row ${row}`);
 }
});

test('an airborne wall contact holds the camera for the measured side-collision timer span (first-level probe)',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 const camera=native.camera11;
 for(let n=1;n<=camera.firstRow+camera.camera.length+2;n++){
  sim.step(frameInputs[n-1]??[],1);
  // The camera drawn after N frames is the native RAM camera of row N-2 (the scroll register trails the RAM value by a frame).
  const row=n-2;if(row>=camera.firstRow&&row<camera.firstRow+camera.camera.length)assert.equal(sim.camera,camera.camera[row-camera.firstRow],`frame ${n}: camera`);
 }
});

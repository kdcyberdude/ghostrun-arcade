import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeMotor} from '../src/native-motor.js';

// Rows from the model-play PPU traces (evidence/local/model-play/it000910) and the winning route. Mario keeps his facing in the air; an air step doubles while facing and motion disagree.
test('air steps double only while the motion byte opposes the facing (mood0 rows 4427..4434)',()=>{
 const m=new NativeMotor();m.facing=1;m.moving=1;m.speed=608;m.takeoff();
 assert.deepEqual(Array.from({length:7},()=>m.air(-1,true)),[456,304,152,0,-152,-456,-760]);
});
test('facing left and moving through byte 0 keeps the single step until byte 1 (mood0 rows 7985..)',()=>{
 const m=new NativeMotor();m.facing=-1;m.moving=-1;m.speed=-684;m.takeoff();
 assert.deepEqual(Array.from({length:8},()=>m.air(1,true)),[-532,-380,-228,-76,76,228,380,684]);
});
test('a landing along the motion while still facing the other way takes one doubled step (mood0 ground spell 1292 -> 1748 -> 1976)',()=>{
 const m=new NativeMotor();m.facing=-1;m.moving=1;m.speed=1292;
 assert.deepEqual([m.groundPress(1,true),m.groundPress(1,true)],[1748,1976]);
});
test('braking across a landing keeps the air class: 208 then doubled (4-2 rows 32616..32618)',()=>{
 const m=new NativeMotor();m.facing=1;m.moving=1;m.airDrop=true;m.speed=5688;
 assert.deepEqual([m.air(-1,true),m.groundPress(-1,true),m.groundPress(-1,true)],[5480,5272,4856]);
});

// Rest starts (model-play rows, mood0/mood2): the first step from exactly 0 follows facing/moving, not a constant 304.
test('a rest start along the last motion takes the run step, against it the doubled walk step, a turnaround from rest the walk step',()=>{
 const a=new NativeMotor();a.facing=1;a.moving=1;
 assert.equal(a.groundPress(1,true),228);
 const b=new NativeMotor();b.facing=1;b.moving=-1;
 assert.equal(b.groundPress(1,true),304);
 const c=new NativeMotor();c.facing=-1;c.moving=-1;
 assert.equal(c.groundPress(1,true),152);
});
// mood0 rows 7261..: B held through a skid to the other side keeps the run step for the following plain presses (-152 -> -380).
test('the run grace survives an opposite press',()=>{
 const m=new NativeMotor();m.facing=1;m.moving=1;
 m.speed=2584;m.updateRun(-1,true);
 m.speed=-152;m.facing=-1;m.moving=-1;
 assert.equal(m.updateRun(-1,false),true);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native excerpt, 3-3 rows 25511-25520 (recorded route, trace x / y byte / speed in 1/4096 px): Mario runs right at speed byte 40 on a ledge (feet 112),
// walks off at x 446-449 (rows 25517-25518 airborne) and the speed stays 10240..10492 (byte 40) in the air. The last jump before it was a walk-class
// jump (speed byte 1), so the stale air class used to cap the remake at byte 24 in one frame (6332 on row 25517).
const NATIVE_SPEEDS_AFTER_WALK_OFF=[10296,10268,10240,10468,10440]; // rows 25517-25521
const run=()=>{
 const level=observedLevels().find(l=>l.id==='3-3')!;
 const s=new Simulation([level]);s.reset(true);s.loadArea('main',[434,112],322);
 s.phase='play';s.phaseFrame=0;
 const p=(s as any).player;p.vx=10360/4096;(s as any).motor.speed=10360;(s as any).motor.airRun=false;
 const speeds:number[]=[];let airborne=false;
 for(let f=0;f<24;f++){
  s.step(['right','b'],1);
  if(!p.grounded)airborne=true;
  if(airborne)speeds.push(Math.round(p.vx*4096));
 }
 return {speeds,airborne};
};

test('3-3 walk-off at run speed after a walk-class jump keeps the run air class (native rows 25517-25521)',()=>{
 const {speeds,airborne}=run();
 assert.ok(airborne,'Mario walks off the ledge');
 for(const native of NATIVE_SPEEDS_AFTER_WALK_OFF)assert.ok(speeds.slice(0,8).some(v=>Math.abs(v-native)<=250),`native speed ${native} is reached in the air, got ${speeds.slice(0,8)}`);
 assert.ok(speeds.slice(0,6).every(v=>Math.floor(v/256)>=39),`speed byte stays near 40 in the air, got ${speeds.slice(0,6)}`);
});

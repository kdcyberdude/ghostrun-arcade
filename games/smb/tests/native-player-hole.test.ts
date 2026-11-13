import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';
import {nativePlayerHoleLocks} from '../src/native-player-hole.js';import {NativeParserClock} from '../src/native-parser-clock.js';import {NativeAreaControls} from '../src/native-area-controls.js';import fixture from './fixtures/native-player-hole.json';
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),buttons:Button[]=['a','b','select','start','up','down','left','right'];
test('PlayerHole lock predicate matches512 actual-ROM guard calls, including signed CMP/BMI wrap',()=>{
 assert.equal(fixture.hole.length,512);for(const row of fixture.hole)assert.equal(nativePlayerHoleLocks(row.yHigh)?1:row.locked,row.after,`native Y high ${row.yHigh}`);
});
test('parser clock/column agree with46 real-ROM tail calls and independently captured dying rows',()=>{
 assert.equal(fixture.parser.length,46);for(const row of fixture.parser){
  const clock=new NativeParserClock(row.before.task,row.before.scroll),controls=new NativeAreaControls('1-1','main',0);controls.seedNative(row.before.column/16,Boolean(row.before.locked));controls.advance(clock.advance(0,false));
  assert.deepEqual({task:clock.task,scroll:clock.scroll,column:controls.column*16,locked:Number(controls.locked)},row.after,`${row.id} source${row.frame}`);
 }
});
for(const run of fixture.runs)test(`${run.id.slice(5,13)}: cold continuous prefix retains native parser/lock through PlayerLoseLife and partial clear`,()=>{
 const sim:any=new Simulation(observedLevels()),initial=Buffer.from(run.initial,'base64'),pads=Buffer.from(run.pads,'base64');
 assert.equal(hash(initial),run.initialSha256);assert.equal(hash(pads),run.inputSha256);assert.ok(initial.every(b=>b===255),'authenticated native cold start');
 sim.twoPlayer=false;sim.reset(false);sim.events.splice(0);const rows=new Map(run.rows.map(r=>[r.frame,r]));
 for(let frame=0;frame<pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);sim.events.splice(0);const row=rows.get(frame);if(!row)continue;
  assert.deepEqual({task:sim.parserClock.task,scroll:sim.parserClock.scroll,column:sim.parserColumnX,locked:Number(sim.areaControls.locked)},{task:row.task,scroll:row.scroll,column:row.column,locked:row.locked},`source aliases frame${frame} engine${row.engine} task${row.modeTask}`);
 }
});

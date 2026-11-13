import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PlayerMotor} from '../src/native-player-motor.js';
import {nativeSidePipe,nativeSidePipeTimer} from '../src/native-pipe.js';
import events from './fixtures/native-side-pipe-events.json';
test('native side-pipe entry preserves the speed fraction and reuses normal friction on every engine2/7 row',()=>{
 assert.ok(events.length>=800);
 for(const e of events){
  const m=new PlayerMotor();Object.assign(m,e.before.motor);
  const x=nativeSidePipe(m,e.before.x,e.grounded,e.water,e.entrance);
  assert.equal(nativeSidePipeTimer(e.before.change,x,e.camera,e.entrance),e.after.change,`${e.level} row${e.frame} change timer`);
  assert.equal(x,e.after.x,`${e.level} row${e.frame} x`);
  for(const [key,value] of Object.entries(e.after.motor))assert.equal(m[key as keyof PlayerMotor],value,`${e.level} row${e.frame} ${key}`);
 }
});

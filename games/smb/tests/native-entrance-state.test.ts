import {test} from 'node:test';import assert from 'node:assert/strict';
import {nativeEntranceSetup,nativeEntranceAction} from '../src/native-entrance.js';
import {nativeImposeGravity} from '../src/simulation.js';
import events from './fixtures/native-entrance-fall-events.json';
test('native area header and alternate entry select source spawn, fall and readiness without room constants',()=>{
 assert.ok(events.some(e=>e.setup?.alternate===1));assert.ok(events.some(e=>e.before?.y===48));
 for(const e of events){
  if(e.setup){const s=e.setup,n=nativeEntranceSetup(s.control<<3,s.alternate,s.page);for(const k of ['x','y','state','forceDown','sprite'] as const)assert.equal(n[k],s[k],`row${e.frame} setup ${k}`);continue;}
  const before=e.before!,after=e.after!,n={...before,timer:0},action=nativeEntranceAction(e.control!,e.alternate!,n.y,e.override!,e.sprite!);
  if(action==='ready')n.engine=8;
  else{assert.equal(action,'fall');if(n.state!==0)nativeImposeGravity(n,e.gravity!,4);n.state=2;}
  delete (n as Partial<typeof n>).timer;
  assert.deepEqual(n,after,`row${e.frame}`);
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {itemShown} from '../src/view-rules.js';
import type {Item} from '../src/types.js';
import fixture from './fixtures/native-powerup-visibility.json';

test('native power-up emergence states1–5 have no sprite, and state6 starts drawing (every native emergence row)',()=>{
 let compared=0;
 for(const level of fixture.levels)for(const [frame,nativePowerState,shown] of level.rows){
  assert.equal(itemShown({nativePowerState} as Item&{nativePowerState:number}),Boolean(shown),`${level.level} native frame ${frame}`);compared++;
 }
 assert.ok(compared>=67);
 assert.equal(itemShown({kind:'coin'} as Item),true,'other items keep their normal visibility');
});

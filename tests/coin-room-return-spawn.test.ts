import {test} from 'node:test';
import assert from 'node:assert/strict';
import levels from '../data/levels.json';

// Native probe (4-2 pipe at 1360, 3-1 at 624, 4-1 at 2128, 6-2 at 320, 1-1 at 928): the first playable row after the coin room is the exit pipe centre minus 8.
const natives:[string,number][]=[['1-1',2616],['3-1',1080],['4-1',2616],['4-2',2104],['6-2',568],['2-1',1848]];
test('coin room returns spawn at the native first-row x',()=>{
 for(const [id,x] of natives){
  const room=(levels as any[]).find(l=>l.id===id).areas.find((a:any)=>a.id==='bonus-coins');
  assert.equal(room.pipes[0].spawn[0],x,id);assert.equal(room.pipes[0].camera,x-56,id);
 }
});

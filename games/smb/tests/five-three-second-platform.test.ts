import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';

// Isolated support regression: source images establish rider-relative position
// and unchanged motion for one episode, not the unqualified activation/motor.
test('the 5-3 second platform carries a stationary rider without changing its path',()=>{
 const make=()=>{const level=structuredClone(observedLevels().find(item=>item.id==='5-3')!);const sim=new Simulation([level]);sim.reset(true);sim.enemies=[];sim.camera=1300;sim.area.cameraEnd=1300;return sim;};
 const riding=make(),unloaded=make();
 const platform=riding.area.platforms!.find(item=>item.x===1466&&item.y===145&&item.width===32)!;
 const other=unloaded.area.platforms!.find(item=>item.x===1466&&item.y===145&&item.width===32)!;
 assert.ok(platform&&other);
 const initial=riding.platformPosition(platform);
 Object.assign(riding.player,{x:initial.x+16,y:initial.y-1,vx:0,vy:0,grounded:true});
 // A separate fixed support keeps the unloaded control alive for the full test.
 unloaded.tiles.set('89,10',84);
 Object.assign(unloaded.player,{x:1424,y:160,vx:0,vy:0,grounded:true});
 for(let frame=0;frame<165;frame++){
  riding.step([],1);unloaded.step([],1);
  const position=riding.platformPosition(platform),unloadedPosition=unloaded.platformPosition(other);
  assert.equal(riding.phase,'play');assert.equal(unloaded.phase,'play');
  assert.equal(riding.camera,unloaded.camera);
  assert.ok(Math.abs(riding.player.x-position.x-16)<0.01);
  assert.ok(Math.abs(riding.player.y-position.y+1)<0.01);
  assert.deepEqual(position,unloadedPosition);
 }
});

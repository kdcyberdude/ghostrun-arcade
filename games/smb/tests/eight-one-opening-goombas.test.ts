import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('8-1 opening has three active left-moving Goombas',()=>{
 const level=structuredClone(observedLevels().find(level=>level.id==='8-1')!);
 const sim=new Simulation([level]);sim.reset(true);
 // Isolated observation fixture: place the camera at the surveyed opening and
 // keep Mario away. This is not a normal campaign traversal or an exact spawn fit.
 sim.camera=160;sim.player.x=160;
 const group=sim.enemies.filter(enemy=>enemy.kind==='goomba'&&enemy.originX>=340&&enemy.originX<440);
 assert.equal(group.length,3,'native tick 8796 visibly has three Goombas');
 sim.step([],1); // made as a native group at ScreenRight (camera + 255), +24, +48 on the activation frame
 assert.deepEqual(group.map(enemy=>Math.floor(enemy.x)),[415,438,462]);
 const start=group.map(enemy=>enemy.x);
 sim.step([],29);
 assert.ok(group.every((enemy,index)=>enemy.active&&enemy.x<start[index]),'all three must actually move left');
});

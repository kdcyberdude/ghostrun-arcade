import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('a falling walker uses its pre-movement Y for the player collision box',()=>{
 // RunNormalEnemies: GetEnemyBoundBox/PlayerEnemyCollision precede
 // EnemyMovementSubs. In 1-2 v2 row1001 the Goomba lands from native Y186
 // to184. Mario feet198 are12px above its pre-move feet210: no stomp.
 // A post-move box instead uses208 and incorrectly starts a bounce.
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.broClock=164;
 const player={x:1200.625,y:198,vy:4};
 assert.equal(sim.nativeStompWindow({kind:'goomba',y:208},player,1193.5,210),false);
 assert.equal(sim.nativeStompWindow({kind:'goomba',y:208},player,1193.5,208),true);
});

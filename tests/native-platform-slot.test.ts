import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';

// Native r5 5-3 mood1 (evidence/platslot-findings-20261111.md): slots hold id 40 @1363, 6, 15, 23 (Bullet Bill generator, x 1312) and 8 while the camera
// crosses the x 1504 platform's spawn (1202); the platform waits off screen, is still blocked when it would be on screen, and never appears (rows 560-760).
function run(busy:boolean){
 const level=structuredClone(observedLevels().find(item=>item.id==='5-3')!);const sim=new Simulation([level]);sim.reset(true);
 const walker=sim.enemies.find(e=>e.kind==='goomba')!;
 sim.enemies=busy?[1290,1300,1310,1320].map(x=>({...walker,x,originX:x,active:true,dead:0,squashed:false,vx:0})):[];
 sim.camera=1180;Object.assign(sim.player,{x:1180+112,y:100,vx:3,vy:0,grounded:false});
 for(let k=0;k<40;k++){sim.step(['right','b'],1);Object.assign(sim.player,{x:sim.camera+116,y:100,vx:3,vy:0});for(const e of sim.enemies){e.x=Math.max(e.x,sim.camera+20);e.y=200;e.vy=0;}}
 assert.ok(sim.camera>=1250,'camera '+sim.camera+' '+sim.phase);
 return sim.platformPosition(sim.area.platforms!.find(p=>p.x===1466&&p.y===145)!);
}
test('5-3: an id 40 platform whose slot never frees before it is on screen is never made',()=>{
 assert.ok(run(true).y>1000);
 assert.ok(run(false).y<200);
});
test('5-3: the vertical Paratroopa at x 1184 starts at native feet 80 (route rows 43109-43180: top y 56)',()=>{
 const level=observedLevels().find(item=>item.id==='5-3')!;
 assert.equal(level.areas.find(a=>a.id==='main')!.enemies.find(e=>e.kind==='paratroopa'&&e.x===1184)!.y,80);
});

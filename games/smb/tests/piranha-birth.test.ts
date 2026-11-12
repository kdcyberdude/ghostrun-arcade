import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Level,Tile} from '../src/types.js';

// Native births (free-play explore-r1 rows, 60 plants): a Piranha appears hidden when its column is built, 358 px ahead of the camera, and its y falls within 1-2 rows (rise start, phase 111).
// Its cycle runs from then on, whatever the scroll speed, so a plant that the remake activates later (at 304) has its age advanced by the frames in between.
function plantLevel():Level{
 const tiles:Tile[]=Array.from({length:120},(_,x)=>[x,13,84]);
 return {id:'plant-birth',time:400,main:'main',evidence:'Synthetic Piranha birth fixture',areas:[{id:'main',width:1920,palette:0,theme:'underground',tiles,enemies:[{kind:'piranha',x:700,y:184,direction:-1}],spawn:[40,208]}]} as unknown as Level;
}

test('a Piranha runs its cycle from the frame its column is built, not from activation',()=>{
 const sim=new Simulation([plantLevel()]);sim.reset(true);
 const plant=sim.enemies[0];
 const run=(camera:number)=>{sim.camera=camera;(sim as any).updateEnemies(sim.player.y);};
 run(350);run(350);run(350); // column built (700 < 350 + 358), still off screen (700 > 350 + 304)
 assert.equal(plant.active,false);
 run(400); // activated on the 4th frame after the birth frame
 assert.equal(plant.active,true);
 const frames=(plant.age+plant.phase!)%220-111;
 assert.ok(frames>=3&&frames<=5,String(frames)+" "+plant.age+" "+plant.phase);
 assert.equal(plant.y,plant.originY-frames*0.5);
});

test('3-2 has the plant native shows at pipe 2704 that the route never meets',()=>{
 const area=observedLevels().find(l=>l.id==='3-2')!.areas.find(a=>a.id==='main')!;
 const plant=area.enemies.find(e=>e.kind==='piranha'&&e.x===2712);
 assert.ok(plant);assert.equal(plant.y,184);
});

// Native free-play rows (plants3 sweep, 5 of 26 runs of 6-2 from r1/r3/w0): the plant at 744 holds a slot whenever Mario reaches it, while the Paratroopa at 688 is absent
// (r1 mood1 rows 331-393: slots 744, 456, 367 Koopa, 520, 568, no Paratroopa). The plant column is built at camera 386 (744 - 358), so the Paratroopa may not take the fifth slot first.
test('6-2 Paratroopa at 688 waits for the camera after the plant at 744 is born',()=>{
 const area=observedLevels().find(l=>l.id==='6-2')!.areas.find(a=>a.id==='main')!;
 const plant=area.enemies.find(e=>e.kind==='piranha'&&e.x===744)!;
 const para=area.enemies.find(e=>e.kind==='paratroopa'&&e.x===688)!;
 assert.ok(para.spawnCamera!>plant.x-358);
});

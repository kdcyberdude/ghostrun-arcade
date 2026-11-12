import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Level,Tile} from '../src/types.js';

// Native births (RAM $071F, 32 v2 runs): the area parser builds the 16 px columns of a 32 px scroll block on task 7 (block + 352..367) and task 3
// (block + 368..383); a pipe Piranha is made in that frame, hidden. The remake activates it on the next frame (the one-frame lag of every list object).
function plantLevel():Level{
 const tiles:Tile[]=Array.from({length:120},(_,x)=>[x,13,84]);
 return {id:'plant-birth',time:400,main:'main',evidence:'Synthetic Piranha birth fixture',areas:[{id:'main',width:1920,palette:0,theme:'underground',tiles,enemies:[{kind:'piranha',x:520,y:184,direction:-1}],spawn:[40,208]}]} as unknown as Level;
}
test('a Piranha is made when its column is built (3-1 row 114: x 520 at the camera 157 -> 160 crossing) and runs from the next frame',()=>{
 const sim:any=new Simulation([plantLevel()]);sim.reset(true);
 const plant=sim.enemies[0];
 sim.camera=157;for(let f=0;f<9;f++){sim.piranhaColumns.step(157);for(const e of sim.enemies)if(!e.active)sim.nativeSlotDenied(e,true);} // the 157 block's eight column tasks are done
 assert.equal(plant.slotHeld,undefined);
 sim.piranhaColumns.step(160);for(const e of sim.enemies)if(!e.active)sim.nativeSlotDenied(e,true);
 assert.equal(plant.slotHeld,true,'block 160: column 520 built on task 7');
 sim.camera=160;sim.player.x=300;sim.updateEnemies(sim.player.y);
 assert.equal(plant.active,true);assert.deepEqual({...plant.pir,y:plant.pir.y},{y:sim.broClock%2===1?159:160,speed:-1,flag:1,up:136,down:160,timer:0});
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

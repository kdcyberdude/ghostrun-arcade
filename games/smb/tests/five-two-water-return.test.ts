import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('5-2 water return leaves Mario alive on the observed pipe while its plant is hidden',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!);
 const main=level.areas.find(a=>a.id==='area-2')!;
 // Native return screenshot 03806-tick-05640: camera 1792, origin 1848,
 // feet 176 on the pipe, with no visible plant at that pipe.
 main.spawn=[1848,176];main.camera=1792;main.entryFall=undefined;
 const sim=new Simulation([level]);sim.reset(true);
 sim.step([],30);
 assert.equal(sim.phase,'play');assert.equal(sim.player.dead,false);
 assert.deepEqual([sim.player.x,sim.player.y],[1848,176]);
 const plant=sim.enemies.find(e=>e.kind==='piranha'&&e.originX===1848)!;
 assert.equal(plant.originY,200);assert.equal(plant.y,200);
});

test('5-2 water return reloads without the two absent Hammer Brothers and retains later actors',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!);
 level.main='optional-water';
 const water=level.areas.find(a=>a.id===level.main)!;
 water.spawn=[978,144];water.camera=774;water.entryFall=undefined;
 const sim=new Simulation([level]);sim.reset(true);
 for(let i=0;i<120&&sim.area.id==='optional-water';i++)sim.step(['right'],1);
 assert.equal(sim.area.id,'area-2');sim.step([],1);
 assert.ok(sim.enemies.every(e=>e.kind!=='hammerBro'||![1904,2000].includes(e.originX)));
 assert.ok(sim.enemies.some(e=>e.kind==='piranha'&&e.originX===1848));
 for(const x of [2176,2192])assert.ok(sim.enemies.some(e=>e.kind==='beetle'&&e.originX===x));
 const normal=new Simulation([structuredClone(observedLevels().find(l=>l.id==='5-2')!)]);normal.reset(true);
 for(const x of [1904,2000])assert.ok(normal.enemies.some(e=>e.kind==='hammerBro'&&e.originX===x));
});

test('5-2 water return shifts only the observed non-solid cloud artwork',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!);
 const main=level.areas.find(a=>a.id==='area-2')!,originalDecorations=structuredClone(main.decorations!),originalFree=structuredClone(main.freeTiles!);
 level.main='optional-water';const water=level.areas.find(a=>a.id===level.main)!;
 water.spawn=[978,144];water.camera=774;water.entryFall=undefined;
 assert.equal(water.pipes!.find(p=>p.to==='area-2')!.returnCloudOffsetX,2);
 const sim=new Simulation([level]);sim.reset(true);
 for(let i=0;i<120&&sim.area.id==='optional-water';i++)sim.step(['right'],1);
 assert.equal(sim.area.id,'area-2');
 const expected=<T extends {id:number;x:number}>(pieces:T[])=>pieces.map(p=>p.id>=128&&p.id<=133?{...p,x:p.x+2}:p);
 assert.ok(originalDecorations.some(p=>p.id>=128&&p.id<=133));
 assert.ok(originalFree.some(p=>p.id>=128&&p.id<=133));
 assert.deepEqual(sim.area.decorations,expected(originalDecorations));assert.deepEqual(sim.freeTiles,expected(originalFree));
 const normal=new Simulation([structuredClone(observedLevels().find(l=>l.id==='5-2')!)]);normal.reset(true);
 assert.deepEqual(normal.area.decorations,originalDecorations);assert.deepEqual(normal.freeTiles,originalFree);
});

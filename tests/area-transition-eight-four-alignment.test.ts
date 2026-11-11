import {test} from 'node:test';
import assert from 'node:assert/strict';
import alignment from '../data/eight-four-native-alignment.json';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import type {Area,Level} from '../src/types.js';

// Native 8-4 geometry measured from the recorded winning route (data/eight-four-native-alignment.json): the wrong-corridor
// wrap subtracts exactly 1024 px, the water-room pipe wall is at 1104 and the main-area exit pipe is at unrolled x 1296-1327.
const level=()=>structuredClone(observedLevels().find(l=>l.id==='8-4')!);
const area=(id:string)=>level().areas.find(a=>a.id===id)!;
const tile=(a:Area,col:number,row:number)=>a.tiles.find(t=>t[0]===col&&t[1]===row)?.[2];

function standing(id:string,spawn:[number,number],frames=6){
 const l:Level=level();l.main=id;const a=l.areas.find(x=>x.id===id)!;a.spawn=spawn;a.camera=Math.max(0,spawn[0]-112);a.entryFall=undefined;a.spawnVelocity=[0,0];
 const sim=new Simulation([l]);sim.reset(true);sim.step([],frames);return sim;
}

test('8-4 corridor room repeats every 1024 px, the native wrong-corridor wrap distance',()=>{
 const a=area('area-3');
 assert.equal(alignment.loop.periodPx,1024);
 assert.equal(a.width,1024);assert.equal(a.maze!.loopAt,1024);assert.equal(a.maze!.loopTo,0);
 for(const row of alignment.loop.observed)assert.equal(row.xBefore-row.xAfter>=1021&&row.xBefore-row.xAfter<=1025,true,`native wrap at row ${row.nativeRow}`);
});

test('8-4 water room ends at the native pipe wall: mouth at 1088, wall 1104, trigger 29 px before the wall',()=>{
 const a=area('area-4'),pipe=a.pipes![0];
 assert.equal(a.width,alignment['area-4'].width);assert.equal(pipe.x,alignment['area-4'].pipeX);
 assert.equal(pipe.entryTriggerX,1104-29);
 assert.ok(a.tiles.every(t=>t[0]*16<a.width),'no tile beyond the shortened room');
 // Native Mario lands on the pipe ledge (feet 144) at x 1072 and walks 1075 -> 1088 into the pipe.
 const sim=standing('area-4',[1072,144]);
 assert.equal(sim.player.y,144);assert.equal(sim.player.grounded,true);
});

test('8-4 main castle has the native exit pipe at unrolled x 1296-1327 and no pipe where native Mario passes at 1136',()=>{
 const a=area('main'),m=alignment.main;
 assert.equal(a.width,m.width);
 assert.equal(a.pipes!.length,1);assert.deepEqual([a.pipes![0].x,a.pipes![0].y],[m.pipe.specX,m.pipe.specY]);
 assert.equal(tile(a,m.pipe.leftColumn,m.pipe.topRow),m.pipe.topLeft);assert.equal(tile(a,m.pipe.leftColumn+1,m.pipe.topRow),m.pipe.topRight);
 // The old pipe (columns 71-72) and the old tall pipe region are open floor/air natively.
 for(let row=8;row<=12;row++)assert.equal(tile(a,71,row),undefined,`old pipe cell row ${row}`);
 assert.equal(a.enemies.some(e=>e.kind==='piranha'&&e.x===1128),false);
 // Native Mario stands at feet 96 on the unrolled ledge for x 1207-1281 and stands on the new pipe top at 1301.
 assert.equal(standing('main',[1240,96]).player.y,96);
 const top=standing('main',[1304,128]);assert.equal(top.player.y,128);assert.equal(top.player.grounded,true);
});

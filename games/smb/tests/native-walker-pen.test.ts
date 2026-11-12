import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

// Native excerpt: the Goomba of 1-2 (x 447..480) trapped between two walls while the model stalls at x 414 (model-play it000910 mood 1, rows
// 4076-4150, 15 turns). Integer native x each frame: 450 449 449 448 448 447 | 448 448 449 449 450 ... 478 478 479 479 480 | 479 479 478 478:
// 0.5 px per frame, the turn costs no frame and the legs are 65 frames long (the remake used to undo the step and lose one frame: 68-frame legs).
const NATIVE_TURN_LEFT=[450,449,449,448,448,447,448,448,449,449,450];
const NATIVE_TURN_RIGHT=[478,478,479,479,480,479,479,478,478];

function pen():Simulation{
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,13,84]);
 for(let y=11;y<=12;y++){tiles.push([27,y,84]);tiles.push([31,y,84]);} // wall faces at x 448 and x 496
 const area:Area={id:'main',width:1024,palette:0,theme:'ground',tiles,enemies:[{kind:'goomba',x:468,y:208,palette:'0f-0c-3c-1c',direction:-1,spawnCamera:0}],spawn:[100,208],evidence:'Synthetic pen fixture'};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim;
}

test('a goomba between two walls turns without losing a frame (native 1-2 pen, 65-frame legs)',()=>{
 const sim=pen();const g=sim.enemies[0];const xs:number[]=[];
 for(let f=0;f<400;f++){sim.step([],1);xs.push(g.x);}
 const turns:number[]=[];for(let i=2;i<xs.length;i++)if((xs[i]-xs[i-1])*(xs[i-1]-xs[i-2])<0)turns.push(i-1);
 assert.ok(turns.length>=4,`turns ${turns}`);
 for(let i=1;i<turns.length;i++)assert.equal(turns[i]-turns[i-1],65,`leg ${i}: ${turns}`);
 const lo=Math.min(...xs),hi=Math.max(...xs);
 assert.deepEqual([Math.floor(lo),Math.floor(hi)],[447,480]);
 const i=turns.find(t=>xs[t]===lo)!;
 assert.deepEqual(xs.slice(i-5,i+6).map(Math.floor),NATIVE_TURN_LEFT);
 const j=turns.find(t=>xs[t]===hi)!;
 assert.deepEqual(xs.slice(j-4,j+5).map(Math.floor),NATIVE_TURN_RIGHT);
});

// 1-1 spawns from native first appearances of the winning route (x, camera at the first slot row; leaders of a pair appear at x - camera 255, the follower 24 px later).
test('1-1 pair goombas spawn at the native x and camera (route first appearances, 24 px apart)',async()=>{
 const {observedLevels}=await import('../src/levels.js');
 const main=observedLevels().find(l=>l.id==='1-1')!.areas.find(a=>a.id==='main')!;
 const at=(x:number)=>main.enemies!.find(e=>e.kind==='goomba'&&e.x===x)!;
 for(const [x,cam] of [[818,563],[841,563],[1553,1298],[1577,1298],[1828,1573],[1852,1573]])assert.equal(at(x).spawnCamera,cam,`goomba ${x}`);
});

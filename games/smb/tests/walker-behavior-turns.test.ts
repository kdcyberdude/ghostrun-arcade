import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {EnemySpec,Level,Tile} from '../src/types.js';

// Area D (ground walkers). Synthetic fixtures; the measured values come from the native enemy slots of the recorded route
// (evidence/walker-behavior-findings-20261109.md): Red Koopas turn when the point under their centre loses support, and walking
// enemies turn back when a squashed Goomba is 10 px ahead or a stationary shell is 12 px ahead.
function fixture(enemies:EnemySpec[],floorColumns:number[]):Simulation{
 const tiles:Tile[]=floorColumns.map(x=>[x,13,84] as Tile);
 const level:Level={id:'walker-fixture',time:400,main:'main',evidence:'Synthetic walker mechanics fixture, not a campaign map',areas:[{id:'main',width:1024,palette:0,theme:'ground',tiles,enemies,spawn:[40,208],evidence:'test'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
const range=(a:number,b:number)=>Array.from({length:b-a+1},(_,i)=>a+i);
const extent=(sim:Simulation,index:number,frames:number)=>{let min=Infinity,max=-Infinity;for(let i=0;i<frames;i++){sim.step([],1);const e=sim.enemies[index];min=Math.min(min,e.x);max=Math.max(max,e.x);}return {min,max};};

test('a Red Koopa walking left turns when the point under its centre leaves the ledge',()=>{
 // Platform from x 128 (column 8): native 1-3, 4-3 and 5-3 Red Koopas turned at floor(x)=platformStart-9 (probe at x+8).
 const sim=fixture([{kind:'redKoopa',x:240,y:208,direction:-1}],[...range(0,3),...range(8,20)]);
 const {min}=extent(sim,0,400);
 assert.equal(min,119.5);assert.ok(sim.enemies[0].vx>0);assert.ok(sim.enemies[0].y===208);
});

test('a Red Koopa walking right turns when the point under its centre passes the ledge end',()=>{
 // Platform end (exclusive) at x 336: the native 7-3 Red Koopa turned at x=end-8 (floor).
 const sim=fixture([{kind:'redKoopa',x:240,y:208,direction:1}],[...range(0,3),...range(8,20)]);
 const {max}=extent(sim,0,400);
 assert.equal(max,328);assert.ok(sim.enemies[0].vx<0);
});

test('a Goomba walking left turns back when a squashed Goomba is 10 px ahead',()=>{
 const sim=fixture([{kind:'goomba',x:200,y:208,direction:-1},{kind:'goomba',x:220,y:208,direction:-1}],range(0,63));
 sim.step([],1);const corpse=sim.enemies[0],walker=sim.enemies[1];
 corpse.x=200;corpse.dead=1;corpse.squashed=true;corpse.vx=0;
 let min=Infinity;for(let i=0;i<60;i++){sim.step([],1);min=Math.min(min,walker.x);}
 assert.equal(min,210.5);assert.ok(walker.vx>0);assert.ok(walker.x>min);
});

test('a squashed Goomba does not turn walkers once its squash has finished',()=>{
 const sim=fixture([{kind:'goomba',x:200,y:208,direction:-1},{kind:'goomba',x:220,y:208,direction:-1}],range(0,63));
 sim.step([],1);const corpse=sim.enemies[0],walker=sim.enemies[1];
 corpse.x=200;corpse.dead=100;corpse.squashed=true;corpse.vx=0;
 const {min}=extent(sim,1,60);
 assert.ok(min<205);assert.ok(walker.vx<0);
});

test('a Koopa walking left turns back when a stationary shell is 12 px ahead',()=>{
 const sim=fixture([{kind:'koopa',x:200,y:208,direction:-1},{kind:'koopa',x:220,y:208,direction:-1}],range(0,63));
 sim.step([],1);const shell=sim.enemies[0],walker=sim.enemies[1];
 shell.x=200;shell.shell=true;shell.movingShell=false;shell.vx=0;
 let min=Infinity;for(let i=0;i<60;i++){sim.step([],1);shell.shellAge=0;min=Math.min(min,walker.x);}
 assert.equal(min,212.5);assert.ok(walker.vx>0);
});

test('two live walkers still reverse at the existing 16 px contact distance',()=>{
 const sim=fixture([{kind:'goomba',x:100,y:208,direction:1},{kind:'goomba',x:140,y:208,direction:-1}],range(0,63));
 sim.step([],60);
 assert.ok(sim.enemies[0].vx<0&&sim.enemies[1].vx>0);
});

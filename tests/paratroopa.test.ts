import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GREEN_PARATROOPA_PHYSICS,Simulation} from '../src/simulation.js';
import type {EnemySpec,Level} from '../src/types.js';
import measured from '../data/paratroopa-physics-candidate.json';

function fixture(direction=1,floorEnd=1024,kind:EnemySpec['kind']='paratroopa',palette='0f-1a-30-27'){
 const level:Level={id:'trajectory-fixture',time:400,main:'main',evidence:'Explicit diagnostic fixture, not campaign traversal',areas:[{id:'main',width:1024,palette:0,theme:'ground',tiles:[],solidRects:[{x:0,y:208,width:floorEnd,height:32,id:84}],enemies:[{kind,x:200,y:208,direction,palette}],spawn:[40,208],evidence:'Floor208 is observed; horizontal translation keeps the isolated actor visible.'}]};
 const sim=new Simulation([level]);sim.reset(true);sim.enemies[0].active=true;return sim;
}

function compareTrajectory(caseData:{initialY:number;initialVy:number;rows:{frame:number;reference:number}[]},direction:number,tolerance:number,floorEnd=1024){
 const sim=fixture(direction,floorEnd),enemy=sim.enemies[0];enemy.y=caseData.initialY;enemy.vy=caseData.initialVy;
 // Condition once on the first two visible images. No later position correction.
 const start=caseData.rows[0].frame;let elapsed=0,maxError=0;
 for(const row of caseData.rows){const frame=row.frame-start;sim.step([],frame-elapsed);elapsed=frame;const error=Math.abs(Math.floor(enemy.y+1e-7)-row.reference);maxError=Math.max(error,maxError);assert.ok(error<=tolerance,`native frame ${row.frame}: feet ${enemy.y}, reference ${row.reference}`);assert.equal(sim.phase,'play');}
 return {sim,enemy,maxError};
}

test('green bounce follows the captured dense 2-1 trajectory within the declared 1px tolerance',()=>{
 const result=compareTrajectory(measured.training,1,measured.declaredTolerance.trainingMaxPixels);
 assert.equal(result.maxError,1);
});

test('the independent left-and-wait branch validates repeated green bounces within 2px',()=>{
 const result=compareTrajectory(measured.validation,-1,measured.declaredTolerance.heldoutMaxPixels);
 assert.equal(result.maxError,1);assert.ok(result.enemy.x<120);
});

test('green Paratroopa falls into the actual gap without a scheduled aerial bounce',()=>{
 // Source starts at world2422; observed floor ends2432. Translate actor to200.
 const result=compareTrajectory(measured.gapFall.best,1,0,210);
 assert.equal(result.enemy.vy,GREEN_PARATROOPA_PHYSICS.maxFall);assert.ok(result.enemy.y>234);
});

test('ground-supported green bounce rises about 42px and repeats after 56 native frames',()=>{
 const sim=fixture(),enemy=sim.enemies[0];enemy.vy=GREEN_PARATROOPA_PHYSICS.maxFall; // arriving at speed: contact registers at once (a Paratroopa starting at rest first bounces at age 10)
 sim.step([],1);assert.equal(enemy.vy,GREEN_PARATROOPA_PHYSICS.bounce);
 let top=208;for(let i=0;i<55;i++){sim.step([],1);top=Math.min(top,enemy.y);assert.ok(enemy.y<208);}
 assert.equal(top,165.78125);sim.step([],1);assert.equal(enemy.y,208);assert.equal(enemy.vy,GREEN_PARATROOPA_PHYSICS.bounce);
});

test('ordinary green walkers and red flight retain their prior vertical rules',()=>{
 const walker=fixture(-1,1024,'koopa'),ground=walker.enemies[0];ground.y=160;walker.step([],1);assert.equal(ground.vy,.25);assert.equal(ground.y,160.25);walker.step([],30);assert.equal(ground.y,208);assert.equal(ground.vy,0);
 const red=fixture(-1,1024,'paratroopa','0f-16-30-27'),flying=red.enemies[0];flying.originY=80;flying.y=80;red.step([],45);assert.equal(flying.x,200);assert.equal(flying.y,80+(1-Math.cos(45/56))*48); /* period changed by native data: route 3-3 x 1824 id 15 rows 25995-26170 (98 px in ~175 rows), evidence/platslot-findings-20261111.md */assert.equal(flying.vy,0);
});

test('stomping a green Paratroopa still removes its wings through ordinary collision',()=>{
 const sim=fixture(),enemy=sim.enemies[0];enemy.y=180;enemy.vy=0;sim.player.x=200;sim.player.y=176;sim.player.vy=1;sim.player.grounded=false;
 sim.broClock=1;sim.step([],1);assert.equal(enemy.kind,'koopa');assert.equal(Math.floor(sim.player.vy),-4); /* native 8-2 r6 row 106: vy byte -4 with the falling speed's fraction kept (y 128,125,122,...) */assert.equal(sim.events.includes('sfx_stomp'),true);
});

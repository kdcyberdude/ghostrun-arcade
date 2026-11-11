/** Isolated production-simulation fixtures for the Paratroopa and Beetle rules measured against the native enemy
 * slots (first-fall landing, sink turn, wall probe, activation facing, pair bump, stomp direction). The fixtures are
 * flat synthetic floors; the numbers asserted are the measured rules, not campaign traversal.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GREEN_PARATROOPA_LANDING,GREEN_PARATROOPA_PHYSICS,Simulation} from '../src/simulation.js';
import type {CollisionRect,EnemySpec,Level} from '../src/types.js';

const GREEN='0f-1a-30-27';

function fixture(enemies:EnemySpec[],spawn:[number,number]=[40,208],floorEnd=1024,rects:CollisionRect[]=[]){
 const level:Level={id:'fixture',time:400,main:'main',evidence:'Synthetic Paratroopa and Beetle fixture, not a campaign map',areas:[{id:'main',width:1024,palette:0,theme:'ground',tiles:[],solidRects:[{x:0,y:208,width:floorEnd,height:32,id:84},...rects],enemies,spawn,evidence:'test'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
// Live from the first frame with a chosen direction, so the activation rule is not involved.
function live(sim:Simulation,vx:number[]){sim.enemies.forEach((e,i)=>{e.active=true;e.vx=vx[i];});return sim;}

test('a Paratroopa that starts at rest first bounces at age 10, after sinking 4.8 px into the floor',()=>{
 const sim=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN}]),[0.5]),enemy=sim.enemies[0];
 sim.step([],1);assert.equal(enemy.vy,0,'age 1 starts the fall from rest');
 for(let age=2;age<=9;age++){sim.step([],1);assert.ok(enemy.vy>0&&enemy.y>208,`age ${age} is still sinking`);}
 assert.ok(enemy.y>211.9&&enemy.y<212,`sunk to ${enemy.y}`);
 sim.step([],1);assert.equal(enemy.vy,GREEN_PARATROOPA_PHYSICS.bounce);assert.equal(enemy.y,208);
});

test('a fall slower than one pixel per frame does not register floor contact',()=>{
 const sim=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN}]),[0.5]),enemy=sim.enemies[0];
 enemy.vy=0.6;sim.step([],1);
 assert.ok(enemy.vy<GREEN_PARATROOPA_LANDING.landingSpeed&&enemy.y>208);
 enemy.vy=GREEN_PARATROOPA_PHYSICS.maxFall;enemy.y=206;sim.step([],1);
 assert.equal(enemy.vy,GREEN_PARATROOPA_PHYSICS.bounce);
});

test('registering contact 5 px or more below the floor turns the Paratroopa around, 4.9 px does not',()=>{
 const shallow=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN,spawnYFraction:0}]),[0.5]);shallow.step([],10);
 assert.equal(shallow.enemies[0].vy,GREEN_PARATROOPA_PHYSICS.bounce);assert.equal(shallow.enemies[0].vx,0.5);
 const deep=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN,spawnYFraction:0.2}]),[0.5]);deep.step([],10);
 assert.equal(deep.enemies[0].vy,GREEN_PARATROOPA_PHYSICS.bounce);assert.equal(deep.enemies[0].vx,-0.5);
});

test('the sink turn needs solid ground at the side probe: a pit edge gives no turn',()=>{
 const sim=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN,spawnYFraction:0.5}],[40,208],220),[0.5]);
 sim.step([],10);
 assert.equal(sim.enemies[0].vy,GREEN_PARATROOPA_PHYSICS.bounce);assert.equal(sim.enemies[0].vx,0.5);
});

test('the spawn vertical state seeds the first fall: a measured initial velocity shortens it',()=>{
 // spawnVy is the native vertical speed of the first slot sample; a Paratroopa already falling at 0.53125 registers before age 10.
 const sim=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN,spawnVy:0.53125,spawnYFraction:0.35}]),[0.5]),enemy=sim.enemies[0];
 let age=0;while(enemy.vy>0||age===0){sim.step([],1);age++;assert.ok(age<12);}
 assert.ok(age<10,`bounced at age ${age}`);
});

test('Paratroopa and Beetle side probes sit at the edges of the sprite, 5 px above the feet',()=>{
 const wall:CollisionRect={x:216,y:160,width:16,height:48,id:84};
 for(const kind of ['paratroopa','beetle'] as const){
  const sim=live(fixture([{kind,x:190,y:208,direction:1,palette:kind==='paratroopa'?GREEN:undefined}],[40,208],1024,[wall]),[0.5]),enemy=sim.enemies[0];
  let maxX=0;for(let i=0;i<40&&enemy.vx>0;i++){sim.step([],1);maxX=Math.max(maxX,enemy.x);}
  assert.equal(enemy.vx,-0.5,`${kind} turned at the wall`);assert.equal(maxX,199.5,`${kind}: x+16 reaches the wall at 216`);
 }
 const leftWall:CollisionRect={x:184,y:160,width:16,height:48,id:84};
 const left=live(fixture([{kind:'beetle',x:230,y:208,direction:-1}],[300,208],1024,[leftWall]),[-0.5]),beetle=left.enemies[0];
 let minX=999;for(let i=0;i<80&&beetle.vx<0;i++){left.step([],1);minX=Math.min(minX,beetle.x);}
 assert.equal(beetle.vx,0.5);assert.equal(minX,200,'x+0 reaches the wall face at 200');
});

test('a floating block above the head height does not turn a Paratroopa or Beetle',()=>{
 const block:CollisionRect={x:216,y:144,width:16,height:16,id:84};
 const sim=live(fixture([{kind:'beetle',x:190,y:208,direction:1}],[40,208],1024,[block]),[0.5]);
 sim.step([],60);assert.equal(sim.enemies[0].vx,0.5);assert.equal(sim.enemies[0].x,220);
});

test('Paratroopas and Beetles start walking toward Mario when they activate; Goombas keep their direction',()=>{
 const left=fixture([{kind:'beetle',x:250,y:208,direction:1},{kind:'paratroopa',x:260,y:208,direction:1,palette:GREEN},{kind:'goomba',x:270,y:208,direction:1}],[40,208]);
 left.step([],1);
 assert.deepEqual(left.enemies.map(e=>e.active),[true,true,true]);
 assert.ok(left.enemies[0].vx<0&&left.enemies[1].vx<0,'toward Mario on the left');assert.ok(left.enemies[2].vx>0);
 const right=fixture([{kind:'beetle',x:190,y:208,direction:-1},{kind:'paratroopa',x:180,y:208,direction:-1,palette:GREEN}],[300,208]);
 right.step([],1);
 assert.ok(right.enemies[0].vx>0&&right.enemies[1].vx>0,'toward Mario on the right');
});

test('a Beetle pair turns around once when their boxes first overlap (|dx| < 12), then walks apart',()=>{
 const sim=live(fixture([{kind:'beetle',x:100,y:208,direction:1},{kind:'beetle',x:130,y:208,direction:-1}]),[0.5,-0.5]),[first,second]=sim.enemies;
 let flipped=-1;for(let i=0;i<40;i++){sim.step([],1);if(flipped<0&&first.vx<0){flipped=i;assert.equal(second.vx,0.5);assert.ok(Math.abs(first.x-second.x)<12&&Math.abs(first.x-second.x)>=11);}}
 assert.ok(flipped>0);assert.equal(first.vx,-0.5);assert.equal(second.vx,0.5);
 assert.ok(second.x-first.x>12,'separated after turning, no repeated reversals');
});

test('a Beetle pair that first appears already overlapping is not turned, it walks through',()=>{
 const sim=live(fixture([{kind:'beetle',x:100,y:208,direction:1},{kind:'beetle',x:104,y:208,direction:-1}]),[0.5,-0.5]),[first,second]=sim.enemies;
 sim.step([],30);
 assert.equal(first.vx,0.5);assert.equal(second.vx,-0.5);assert.ok(first.x>second.x,'crossed without a bump');
});

test('a pair bump survives a structured clone of the simulation state',()=>{
 const sim=live(fixture([{kind:'beetle',x:100,y:208,direction:1},{kind:'beetle',x:130,y:208,direction:-1}]),[0.5,-0.5]);
 sim.step([],5);const copy=structuredClone(sim);
 assert.deepEqual(copy.enemies.map(e=>e.bumpTouch),sim.enemies.map(e=>e.bumpTouch));
});

test('a stomped Paratroopa becomes a Koopa walking away from Mario',()=>{
 for(const [marioX,away] of [[190,1],[198,1],[204,-1],[208,-1]] as const){
  const sim=fixture([{kind:'paratroopa',x:200,y:208,direction:-1,palette:GREEN}],[marioX,150]);
  const enemy=sim.enemies[0];enemy.active=true;enemy.vy=3;
  sim.player.x=marioX;sim.player.y=196;sim.player.vy=2;sim.player.grounded=false;
  sim.step([],2);
  assert.equal(sim.enemies[0].kind,'koopa',`stomped from x${marioX}`);assert.equal(Math.sign(sim.enemies[0].vx),away);
 }
});

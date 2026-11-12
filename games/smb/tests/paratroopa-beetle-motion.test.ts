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

// Native jumping Paratroopa (id 14): integer y with a fraction byte, 8.8 speed, +28/256 per frame (cap 3); EnemyLanding when the speed byte is 1+ and the feet are in a block:
// snap to the block top and speed -3, then that frame's move (8-2 slot 3 rows 83-94: y 56 at rest, speed byte 1 at row 93, row 94 y 53 = snap 56 - 3).
const BOUNCE_ROW_VY=GREEN_PARATROOPA_PHYSICS.bounce+GREEN_PARATROOPA_PHYSICS.gravity;
test('a Paratroopa that starts at rest sinks 4 px and first bounces at age 11 (native 8-1 rows 1267-1278)',()=>{
 const sim=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN}]),[0.5]),enemy=sim.enemies[0];
 sim.step([],1);assert.equal(enemy.vy,GREEN_PARATROOPA_PHYSICS.gravity,'age 1 starts the fall from rest');assert.equal(enemy.y,208);
 for(let age=2;age<=10;age++){sim.step([],1);assert.ok(enemy.vy>0&&enemy.y>=208,`age ${age} is still sinking`);}
 assert.equal(enemy.y,212,'native 8-1: y 184 -> 188 before the bounce');
 sim.step([],1);assert.equal(enemy.vy,BOUNCE_ROW_VY);assert.equal(enemy.y,205);assert.equal(enemy.vx,0.5);
});

test('a speed byte of 0 does not register floor contact, a speed byte of 1+ does at once',()=>{
 const sim=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN}]),[0.5]),enemy=sim.enemies[0];
 enemy.y=209;enemy.vy=0.6;sim.step([],1);assert.ok(enemy.vy>0&&enemy.y>=209,'speed byte 0: still falling');
 const fast=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN}]),[0.5]),arriving=fast.enemies[0];
 arriving.y=209;arriving.vy=GREEN_PARATROOPA_PHYSICS.maxFall;fast.step([],1);
 assert.equal(arriving.vy,BOUNCE_ROW_VY);assert.equal(arriving.y,205);
});

test('landing 5 px or more below the floor turns the Paratroopa around (side probe 5 px above the feet), 4 px does not',()=>{
 const shallow=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN}]),[0.5]);shallow.step([],11);
 assert.equal(shallow.enemies[0].vy,BOUNCE_ROW_VY);assert.equal(shallow.enemies[0].vx,0.5);
 const deep=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN}]),[0.5]);deep.enemies[0].y=208.2;deep.step([],11); // fraction byte 51: feet 213 when contact registers
 assert.equal(deep.enemies[0].vy,BOUNCE_ROW_VY);assert.equal(deep.enemies[0].vx,-0.5);
});

test('the sink turn needs solid ground at the side probe: a pit edge gives no turn',()=>{
 const sim=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN}],[40,208],220),[0.5]);sim.enemies[0].y=208.5;
 sim.step([],11);
 assert.equal(sim.enemies[0].vy,BOUNCE_ROW_VY);assert.equal(sim.enemies[0].vx,0.5);
});

test('a jumping Paratroopa is made at rest: the route-measured spawnVy and spawnYFraction are not used (native 8-1 row 1267, 8-2 row 83)',()=>{
 const sim=live(fixture([{kind:'paratroopa',x:200,y:208,direction:1,palette:GREEN,spawnVy:0.53125,spawnYFraction:0.35}]),[0.5]),enemy=sim.enemies[0];
 sim.step([],1);assert.equal(enemy.y,208);assert.equal(enemy.vy,GREEN_PARATROOPA_PHYSICS.gravity);
});

test('Paratroopa and Beetle side probes sit at the edges of the sprite, 5 px above the feet',()=>{
 const wall:CollisionRect={x:216,y:160,width:16,height:48,id:84};
 for(const kind of ['paratroopa','beetle'] as const){
  const sim=live(fixture([{kind,x:190,y:208,direction:1,palette:kind==='paratroopa'?GREEN:undefined}],[40,208],1024,[wall]),[0.5]),enemy=sim.enemies[0];
  let maxX=0;for(let i=0;i<40&&enemy.vx>0;i++){sim.step([],1);maxX=Math.max(maxX,enemy.x);}
  assert.equal(enemy.vx,-0.5,`${kind} turned at the wall`);assert.equal(maxX,kind==='beetle'?200:199.5,`${kind}: x+16 reaches the wall at 216; the native walker keeps its completed step`);
 }
 const leftWall:CollisionRect={x:184,y:160,width:16,height:48,id:84};
 const left=live(fixture([{kind:'beetle',x:230,y:208,direction:-1}],[300,208],1024,[leftWall]),[-0.5]),beetle=left.enemies[0];
 let minX=999;for(let i=0;i<80&&beetle.vx<0;i++){left.step([],1);minX=Math.min(minX,beetle.x);}
 assert.equal(beetle.vx,0.5);assert.equal(minX,199.5,'the native walker keeps the half-pixel step into the wall before turning');
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

test('a Beetle pair turns once at inclusive native box contact on an odd frame, then walks apart',()=>{
 const sim=live(fixture([{kind:'beetle',x:100,y:208,direction:1},{kind:'beetle',x:130,y:208,direction:-1}]),[0.5,-0.5]),[first,second]=sim.enemies;
 let flipped=-1;for(let i=0;i<40;i++){sim.step([],1);if(flipped<0&&first.vx<0){flipped=i;assert.equal(second.vx,0.5);assert.ok(Math.abs(first.x-second.x)<=13&&Math.abs(first.x-second.x)>=11);}}
 assert.ok(flipped>0);assert.equal(first.vx,-0.5);assert.equal(second.vx,0.5);
 assert.ok(second.x-first.x>12,'separated after turning, no repeated reversals');
});

test('a Beetle pair that first appears overlapping turns on its first eligible native pass',()=>{
 const sim=live(fixture([{kind:'beetle',x:100,y:208,direction:1},{kind:'beetle',x:104,y:208,direction:-1}]),[0.5,-0.5]),[first,second]=sim.enemies;
 sim.step([],30);
 assert.equal(first.vx,-0.5);assert.equal(second.vx,0.5);assert.ok(first.x<second.x,'separated after the first native contact');
});

test('a pair bump survives a structured clone of the simulation state',()=>{
 const sim=live(fixture([{kind:'beetle',x:100,y:208,direction:1},{kind:'beetle',x:130,y:208,direction:-1}]),[0.5,-0.5]);
 sim.step([],5);const copy=structuredClone(sim);
 assert.deepEqual((copy as any).collisionBits,(sim as any).collisionBits);
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

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {EnemySpec,Level,Tile} from '../src/types.js';

// Rules read from native score digits and the coin count (roles by correlation, evidence/blocks-findings-20261111.md).
function fixture(enemies:EnemySpec[],extra:Tile[]=[]){
 const tiles:Tile[]=[...Array.from({length:80},(_,x)=>[x,13,84] as Tile),...extra];
 const level:Level={id:'score-fixture',time:400,main:'main',evidence:'synthetic',areas:[{id:'main',width:1280,palette:0,theme:'ground',tiles,enemies,spawn:[40,176],evidence:'test'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
const drop=(s:Simulation,x:number,feet:number)=>{const p=s.player;p.x=x;p.y=feet;p.vy=3;p.vx=0;p.grounded=false;};
const fall=(s:Simulation,done:()=>boolean)=>{for(let f=0;f<40&&!done()&&s.phase==='play';f++)s.step([],1);assert.ok(done());};

test('two enemies stomped on one row pay 100 + 400 and leave the chain at 2 (native 8-4 rows 75586 +500, 75606 +400)',()=>{
 const s=fixture([{kind:'goomba',x:94,y:208,direction:-1},{kind:'goomba',x:110,y:208,direction:-1}]);
 drop(s,101,190);fall(s,()=>s.score>0);
 assert.equal(s.score,500);assert.equal((s as any).stompChain,2);assert.equal(s.phase,'play');assert.ok(s.enemies.every(e=>e.dead));
});

test('single stomps climb 100 200 400 500 800',()=>{
 const s=fixture([]) as any;const paid=[0,1,2,3,4].map(()=>s.stompAward());
 assert.deepEqual(paid,[100,200,400,500,800]);
});

test('a shell kick pays two chain steps up and leaves the chain (native 400 at rest, 500 after one stomp, 800 after two)',()=>{
 const s=fixture([]) as any;
 assert.equal(s.shellKickAward(),400);s.stompChain=1;assert.equal(s.shellKickAward(),500);s.stompChain=2;assert.equal(s.shellKickAward(),800);assert.equal(s.stompChain,2);
});

for(const [name,dx,dir] of [['native 688 on 689: right',-1,1],['native 1985 on 1983: right',2,1],['native 388 on 385: left',3,-1],['native 686 on 676: left',10,-1]] as const)
 test(`falling on a resting shell kicks it without a bounce (${name})`,()=>{
  const s=fixture([{kind:'koopa',x:100,y:208,direction:-1}]),e=s.enemies[0];e.active=true;e.shell=true;e.movingShell=false;e.vx=-0.5;
  drop(s,100+dx,192);fall(s,()=>!!e.movingShell);
  assert.equal(Math.sign(e.vx),dir);assert.ok(s.player.vy>=0,'Mario keeps falling');assert.equal(s.score,400);
  for(let f=0;f<8;f++)s.step([],1);assert.equal(e.movingShell,true,'the overlap right after the kick must not stop the shell');assert.equal(s.phase,'play');
 });

const coinAt=(dx:number,dy:number)=>{ // Mario offset from the coin tile at (160,96): dx = x - tile x, dy = feet - tile top
 const s=fixture([],[[10,6,194]]) as any;s.player.x=160+dx;s.player.y=96+dy;s.collectTiles();return s.coins===1;
};
test('coin pickup points follow the native accept/reject grid',()=>{
 assert.equal(coinAt(-13,16),true,'body point x+13');assert.equal(coinAt(-14,16),false);
 assert.equal(coinAt(-12,0),true,'feet point x+12 at the tile top');assert.equal(coinAt(-13,3),false,'no x+13 point at the feet');assert.equal(coinAt(0,-1),false);
 assert.equal(coinAt(-13,23),true,'body point reaches feet-8');assert.equal(coinAt(-11,24),false);
 assert.equal(coinAt(0,29),true,'head point feet-14');assert.equal(coinAt(0,30),false);
});

test('a walker group created late appears further right, followers included (native mood0 row 3081: 708/731 at camera 453; route row 2756: 704/728 at camera 449)',()=>{
 const s=fixture([{kind:'koopa',x:704,y:208,direction:-1,spawnCamera:449},{kind:'koopa',x:728,y:208,direction:-1,spawnCamera:449},{kind:'goomba',x:944,y:208,direction:-1,spawnCamera:642}]) as any;
 s.camera=453;assert.equal(s.spawnGroupShift(s.enemies[0]),4);assert.equal(s.spawnGroupShift(s.enemies[1]),4);
 s.camera=450;assert.equal(s.spawnGroupShift(s.enemies[0]),0,'under 3 px is the camera phase of the recorded trigger');
 s.camera=560;assert.equal(s.spawnGroupShift(s.enemies[0]),0,'a load past the trigger is not a scroll');
 s.camera=646;assert.equal(s.spawnGroupShift(s.enemies[2]),0,'lone walkers keep their x');
});

test('coins and blocks the screenshot maps lost are back where native collects them',()=>{
 const levels=observedLevels(),cell=(l:string,a:string,c:number,r:number)=>levels.find(x=>x.id===l)!.areas.find(x=>x.id===a)!.tiles.find(t=>t[0]===c&&t[1]===r)?.[2];
 assert.equal(cell('2-3','main',97,5),194,'route row 17479');assert.equal(cell('4-3','main',70,2),194,'route row 35037');assert.equal(cell('2-2','area-2',102,11),195,'route row 13517');
 assert.equal(cell('5-4','main',102,12),194,'route row 45320');assert.equal(cell('5-4','main',103,12),undefined,'native passes this cell without a pickup');
 assert.equal(cell('2-1','main',85,9),192,'route row 9480 pays a coin here');assert.equal(cell('1-2','area-2',10,9),193,'mood1 row 2963: no coin');assert.equal(cell('1-2','area-2',11,9),192);
 assert.ok(levels.find(x=>x.id==='5-2')!.areas.find(x=>x.id==='area-2')!.blockContents!.some(b=>b.col===31&&b.row===9&&(b.kind as string)==='coin'),'route row 40715');
});

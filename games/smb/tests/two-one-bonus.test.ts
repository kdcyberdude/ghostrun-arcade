import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import sourceRoom from '../data/two-one-pipe-room.json';
import entryMeasurements from '../data/optional-two-one-entry-measurements.json';

function pipeFixture(){
 const level=structuredClone(observedLevels().find(l=>l.id==='2-1')!),main=level.areas.find(a=>a.id==='main')!;
 // Exact source image1296: right pipe tile17 at126,144 anchors camera1538;
 // complete player origin114 therefore gives world1652,feet144.
 main.spawn=[1652,144];main.camera=1538;
 const sim=new Simulation([level]);sim.reset(true);sim.enemies=[];return sim;
}

test('2-1 bonus retains its unique supplied-palette map and observed connections',()=>{
 const level=observedLevels().find(l=>l.id==='2-1')!,main=level.areas.find(a=>a.id==='main')!,room=level.areas.find(a=>a.id==='bonus-coins')!;
 assert.equal(room.width,256);assert.equal(room.palette,4);assert.equal(room.tiles.length,105);
 assert.equal(room.tiles.filter(t=>t[2]===194).length,19);assert.deepEqual(sourceRoom.unknownCells,[]);
 assert.deepEqual(room.tiles,sourceRoom.tiles.map(([x,y,id])=>[x,y,id===71?82:id]));
 const entrance=main.pipes!.find(p=>p.to===room.id)!;assert.equal(entrance.targetLevel,undefined);
 assert.deepEqual([entrance.x,entrance.y,entrance.direction],[1664,144,'down']);
 assert.equal(entrance.transitionFrames,79);
 const back=room.pipes!.find(p=>p.to==='main')!;assert.equal(back.targetLevel,undefined);
 assert.deepEqual([back.x,back.y,back.direction,back.spawn,back.camera],[208,208,'right',[1848,176],1792]);
});

test('ordinary down enters the compiled 2-1 room without a level intro or lost progress',()=>{
 const sim=pipeFixture();sim.time=365;sim.coins=13;sim.score=52800;
 let sawPipe=false;for(let frame=0;frame<151;frame++){
  sim.step(['down'],1);sawPipe ||= sim.phase==='pipe';assert.notEqual(sim.phase,'intro');assert.equal(sim.level.id,'2-1');assert.equal(sim.lives,3);
 }
 assert.ok(sawPipe);assert.equal(sim.area.id,'bonus-coins');assert.equal(sim.phase,'play');
 assert.deepEqual([sim.player.x,sim.player.y],[24,208]);assert.equal(sim.coins,13);assert.equal(sim.score,52800);assert.ok(sim.time<=365);
});

test('ordinary jump and walk traverse 2-1 bonus geometry and enter the same-level side return',()=>{
 const sim=pipeFixture();sim.step(['down'],211);const entryTime=sim.time;
 sim.step(['right','b'],20);sim.step(['right','a','b'],60);sim.step(['right'],100);
 assert.equal(sim.area.id,'bonus-coins');assert.equal(sim.phase,'pipe');assert.equal(sim.lives,3);
 let sawIntro=false;for(let frame=0;frame<90;frame++){sim.step([],1);sawIntro ||= String(sim.phase)==='intro';}
 assert.equal(sawIntro,false);assert.equal(sim.level.id,'2-1');assert.equal(sim.area.id,'main');assert.equal(sim.phase,'play');
 assert.deepEqual([sim.player.x,sim.player.y,sim.camera],[1848,176,1792]);assert.equal(sim.lives,3);
 assert.equal(sim.entryFallPose,false);assert.ok(sim.coins>0);assert.ok(sim.time<entryTime);
 assert.ok(sim.enemies.every(e=>![1856,1920].includes(e.originX)));
 for(const x of [1848,1960,2024])assert.ok(sim.enemies.some(e=>e.kind==='piranha'&&e.originX===x));
 assert.ok(sim.enemies.some(e=>e.kind==='koopa'&&e.originX===2192));
 // The return profile changes this load only, not the normal-route population.
 const normal=new Simulation([structuredClone(observedLevels().find(l=>l.id==='2-1')!)]);normal.reset(true);
 for(const x of [1856,1920])assert.ok(normal.enemies.some(e=>e.kind==='goomba'&&e.originX===x));
});

test('the 2-1-specific transition candidate keeps all fine entry poses within the declared two pixels',()=>{
 const sim=pipeFixture();
 for(const sample of entryMeasurements.measurements){
  sim.step(['down'],sample.nativeFramesSinceStart-sim.frame);
  if(sample.tick<1307||!sample.player)continue;
  assert.equal(sim.player.x,sample.player.originX);
  assert.ok(Math.abs(Math.floor(sim.player.y)-sample.player.feetY)<=entryMeasurements.tolerance.positionComparisonPixels,`${sample.tick}: ${sim.player.y} vs ${sample.player.feetY}`);
 }
});

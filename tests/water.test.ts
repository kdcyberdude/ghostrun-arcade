import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {compareWaterCase,waterFixture} from '../tools/compare-water.js';
import {compareWaterMeasuredCase} from '../tools/compare-water-production.js';

for(const name of ['water-walk','water-run','water-reverse','water-short-a','water-held-a','water-air-walk','water-air-run','water-repeated-a','water-surface']){
 test(`${name} matches captured native-frame position checkpoints within 2px`,()=>{
  const result=compareWaterCase(name);
  assert.ok(result.samples>=11);
  assert.ok(result.pass,JSON.stringify({name,maxXError:result.maxXError,maxYError:result.maxYError,firstDivergence:result.rows.find(row=>Math.abs(row.dx)>2||Math.abs(row.dy)>2)}));
 });
}
for(const name of ['reserved-surface-restroke-release','reserved-surface-phase25-restroke-long']){
 test(`${name} retains its once-heldout 2px position result`,()=>{
  const result=compareWaterMeasuredCase(name);
  assert.ok(result.samples>=40);assert.ok(result.pass,JSON.stringify(result.firstDivergence));
 });
}
test('the observed long stroke in World 2-2 reaches its recorded surface height',()=>{
 const result=compareWaterMeasuredCase('heldout-long-strokes');
 const sample=result.rows.find(row=>row.frame===173)!;
 assert.equal(sample.reference[1],40);
 assert.ok(Math.abs(sample.dy)<=2,JSON.stringify(sample));
});
test('B has no small-player swimming speed effect on the measured floor or airborne sequences',()=>{
 for(const [a,b]of [['water-walk','water-run'],['water-air-walk','water-air-run']]){
  assert.deepEqual(compareWaterCase(a).rows.map(r=>r.remake),compareWaterCase(b).rows.map(r=>r.remake));
 }
});
test('holding A does not repeat a stroke after landing; release and press creates another stroke',()=>{
 // Fresh phase24/25 captures retain actual7/8-frame decisions. The synthetic
 // old8+8 feet<200 assertion was not a reference measurement.
 for(const [release,stroke,feet]of [[8,7,201],[7,8,199]]){
  const sim=new Simulation([waterFixture()]);sim.reset(true);sim.events=[];
  sim.step(['a'],180);assert.equal(sim.player.y,208);assert.equal(sim.events.filter(e=>e==='sfx_swim').length,1);
  sim.step([],release);sim.step(['a'],stroke);
  assert.ok(Math.abs(Math.floor(sim.player.y)-feet)<=2);assert.ok(sim.player.vy<0);assert.ok(sim.player.y<208);
  assert.equal(sim.events.filter(e=>e==='sfx_swim').length,2);
 }
 for(const name of ['floor-restroke-phase24','floor-restroke-phase25'])assert.ok(compareWaterMeasuredCase(name).pass,name);
});
test('repeated stroke edges reach above feet 52 and remain below the inferred head boundary',()=>{
 const sim=new Simulation([waterFixture()]);sim.reset(true);let minFeet=208;
 for(let frame=0;frame<360;frame++){sim.step(frame%15<8?['a']:[],1);minFeet=Math.min(minFeet,sim.player.y);}
 assert.ok(minFeet<52);assert.ok(minFeet>=44);
});
test('repeated surface strokes cannot pass above the 7-2 style overhead wall',()=>{
 const level=waterFixture(),area=level.areas[0];
 for(let row=2;row<5;row++)area.tiles.push([15,row,97]);
 const sim=new Simulation([level]);sim.reset(true);
 for(let frame=0;frame<800;frame++)sim.step(frame%24<20?['right','a','b']:['right','b'],1);
 // Horizontal collision preserves a subpixel fraction; compare the drawn pixel.
 assert.ok(Math.floor(sim.player.x)+13<=240,`swimmer passed the wall: x=${sim.player.x}`);
});
test('repeated swimming strokes cannot cross above the actual 7-2 overhead wall',()=>{
 // Image-derived wall column; isolated nearby spawn with enemies removed.
 const sim=new Simulation(observedLevels());sim.reset(true);sim.levelIndex=sim.levels.findIndex(level=>level.id==='7-2');
 sim.loadArea('area-4',[1184,96],1072);sim.enemies=[];
 for(let frame=0;frame<240;frame++){
  sim.step(frame%24<20?['right','a','b']:['right','b'],1);
  assert.ok(!(sim.player.x>=1248&&sim.player.y<=32),`crossed above wall at ${sim.player.x},${sim.player.y}`);
 }
});

test('water entry falls through the measured first 68 native frames before normal swimming',()=>{
 const level=waterFixture(),area=level.areas[0];
 area.spawn=[40,32.875];area.spawnVelocity=[0,0.0625];area.waterEntryFall=true;
 const sim=new Simulation([level]);sim.reset(true);
 // Registered original World 2-2 screenshots, ticks1651..1660. The entry
 // acceleration is a fitted candidate; samples do not uniquely identify it.
 const samples=[[8,37],[15,46],[30,81],[38,109],[45,139],[53,173],[60,202],[68,208]];
 for(const [frame,feet]of samples){sim.step([],frame-sim.frame);assert.ok(Math.abs(sim.player.y-feet)<=2,`${frame}: ${sim.player.y} vs ${feet}`);}
 assert.equal(sim.player.grounded,true);
 sim.step(['a'],8);assert.ok(sim.player.y<208,'ordinary stroke remains available after landing');
});

test('water surface is harmless and castle lava falls through to an offscreen life loss',()=>{
 for(const theme of ['water','castle'] as const){
  const level=waterFixture(),area=level.areas[0];area.theme=theme;area.spawn=[40,48];area.tiles.push([3,2,134]);
  if(theme==='castle')area.tiles=area.tiles.filter(([x,row])=>!(row>=13&&(x===2||x===3)));
  const sim=new Simulation([level]);sim.reset(true);sim.step([],1);assert.equal(sim.phase,'play');
  if(theme==='castle'){
   let frames=0;while(sim.phase==='play'&&frames++<200)sim.step([],1);
   assert.equal(sim.phase,'dying');assert.ok(sim.player.y>272);const feet=sim.player.y;
   // Native castle pits and lava: 245-249 or 259-260 rows by the last jump's fall force; no jump here, the 259-260 class (the older 247 was one sample).
   sim.step([],257);assert.equal(sim.phase,'dying');assert.equal(sim.player.y,feet);assert.equal(sim.lives,3);
   sim.step([],2);assert.equal(sim.phase,'intro');assert.equal(sim.lives,2);
  }
 }
});

test('coral blocks a swimmer beside a ledge until an ordinary stroke clears its top',()=>{
 const level=waterFixture(),area=level.areas[0];area.spawn=[226,96];
 for(let x=0;x<15;x++)area.tiles.push([x,6,97]);area.tiles.push([15,4,34],[15,5,34]);
 const sim=new Simulation([level]);sim.reset(true);sim.step(['right'],45);
 assert.ok(Math.floor(sim.player.x)+13<=240);assert.equal(sim.player.y,96);
 let minimum=96;for(let stroke=0;stroke<8;stroke++){sim.step(['right','a'],8);minimum=Math.min(minimum,sim.player.y);sim.step(['right'],4);}
 assert.ok(minimum<64);assert.ok(sim.player.x>256);assert.equal(sim.phase,'play');
});

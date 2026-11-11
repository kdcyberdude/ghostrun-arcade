/** Synthetic wiring checks; native collision geometry remains unverified. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Level} from '../src/types.js';

function fixture() {
 const area=observedLevels().find(level=>level.id==='1-4')!.areas.find(area=>area.id==='main')!;
 const bar=structuredClone(area.firebars!.find(bar=>bar.x===792&&bar.y===104)!);
 assert.equal(bar.motor?.direction,-1);assert.equal(bar.motor?.initialUnits,768);
 const level:Level={id:'fixture-1-4-second-firebar',time:400,main:'main',evidence:'Synthetic collision wiring',areas:[{
  id:'main',width:2048,palette:0,theme:'ground',spawn:[644,208],camera:532,
  tiles:Array.from({length:128},(_,col)=>[col,13,81]),enemies:[],firebars:[bar],evidence:'Synthetic empty floor',
 }]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
const motor=(sim:Simulation)=>(sim as any).firebarMotors.get(sim.area.firebars![0]).state as {active:boolean;units:number};

test('1-4 second bar activates at inferred camera entry and advances once',()=>{
 const sim=fixture(),bar=sim.area.firebars![0];
 assert.deepEqual(motor(sim),{active:false,units:768});assert.deepEqual(sim.firebarCenters(bar),[]);
 sim.player.vx=1.5;sim.step([],1);
 assert.equal(sim.camera,533);assert.deepEqual(motor(sim),{active:true,units:763});
 assert.deepEqual(sim.firebarCenters(bar)[0],{x:792,y:105});
 sim.step([],1);assert.deepEqual(motor(sim),{active:true,units:758});
});

test('production collision uses the 1-4 second bar centers',()=>{
 const sim=fixture(),bar=sim.area.firebars![0];sim.player.vx=1.5;sim.step([],1);
 sim.player.x=736;sim.player.y=109;sim.player.vx=0;sim.player.vy=0;sim.step([],1);assert.equal(sim.phase,'play');
 sim.player.x=784;sim.player.y=109;sim.player.vx=0;sim.player.vy=0;sim.step([],1);
 assert.equal(sim.phase,'dying');assert.equal(sim.events.filter(event=>event==='event_death').length,1);
 const centers=sim.firebarCenters(bar),units=motor(sim).units;sim.step([],10);
 assert.deepEqual(sim.firebarCenters(bar),centers);assert.equal(motor(sim).units,units);
});

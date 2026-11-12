/** Synthetic integration checks; these do not establish source collision geometry. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Level} from '../src/types.js';

function fixture() {
 const area=observedLevels().find(level=>level.id==='7-4')!.areas.find(area=>area.id==='main')!;
 const bar=structuredClone(area.firebars!.find(bar=>bar.x===1656&&bar.y===120)!);
 assert.equal(bar.motor?.direction,1);
 assert.equal(bar.motor?.initialUnits,768);
 const level:Level={id:'fixture-7-4-firebar',time:400,main:'main',evidence:'Synthetic collision wiring',areas:[{
  id:'main',width:2048,palette:0,theme:'ground',spawn:[1508,208],camera:1396,
  tiles:Array.from({length:128},(_,col)=>[col,13,81]),enemies:[],firebars:[bar],evidence:'Synthetic empty floor',
 }]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
const motor=(sim:Simulation)=>(sim as any).firebarMotors.get(sim.area.firebars![0]).state as {active:boolean;units:number};

test('7-4 bar activates at the inferred camera entry and advances once',()=>{
 const sim=fixture(),bar=sim.area.firebars![0];
 assert.deepEqual(motor(sim),{active:false,units:768});assert.deepEqual(sim.firebarCenters(bar),[]);
 sim.player.vx=1.5;sim.step([],1);
 assert.equal(sim.camera,1397);assert.deepEqual(motor(sim),{active:true,units:773});
 assert.deepEqual(sim.firebarCenters(bar)[0],{x:1656,y:121});
 sim.step([],1);assert.deepEqual(motor(sim),{active:true,units:778});
});

test('production collision consumes the qualified 7-4 bar centers',()=>{
 const sim=fixture(),bar=sim.area.firebars![0];sim.player.vx=1.5;sim.step([],1);
 sim.player.x=1600;sim.player.y=125;sim.player.vx=0;sim.player.vy=0;sim.step([],1);assert.equal(sim.phase,'play');
 sim.player.x=1648;sim.player.y=125;sim.player.vx=0;sim.player.vy=0;sim.step([],1);
 assert.equal(sim.phase,'dying');assert.equal(sim.events.filter(event=>event==='event_death').length,1);
 const centers=sim.firebarCenters(bar),units=motor(sim).units;sim.step([],10);
 assert.deepEqual(sim.firebarCenters(bar),centers);assert.equal(motor(sim).units,units);
});

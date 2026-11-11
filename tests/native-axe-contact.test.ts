import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native 1-4 axe (cell x 2256..2271, y 128..143): 190 grabs in 270 branches from row 7880 and the 8 castle grabs of the route, always falling, with a foot (x+12 or x+3) in the cell at feet 128..139.
// A rising Mario passes it: route row 7917 has x 2244, feet 128, vy -4 and no grab. Falling at x 2242 (x+12 = 2254, route rows 7950-7965) misses it too.
const drop=(x:number,feet:number,vy:number,rows:number)=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-4')!);
 level.areas.find(a=>a.id===level.main)!.enemies=[];
 const s=new Simulation([level]) as any;s.reset(true);s.loadArea(level.main,[Math.floor(x),feet],2100);s.phase='play';s.phaseFrame=0;
 s.area.firebars=[];s.area.platforms=[];
 Object.assign(s.player,{x,y:feet,vx:0,vy,grounded:false});Object.assign(s,{jumpArc:true,runJump:true,landJump:'released'});
 const phases:string[]=[];for(let i=0;i<rows;i++){s.step([],1);phases.push(s.phase);}
 return phases;
};
test('a rising Mario passes through the axe cell (native row 7917)',()=>{
 assert.ok(drop(2244,132,-4,3).every(p=>p==='play'));
});
test('a falling Mario left of the foot window misses the axe (native rows 7950-7965)',()=>{
 assert.ok(drop(2242,120,4,6).every(p=>p==='play'));
});
test('a falling Mario grabs the axe on the first row with a foot in the cell (native branch: x 2244, feet 126 -> 128)',()=>{
 assert.deepEqual(drop(2244,126,2,1),['castle']);
});

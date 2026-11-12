import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('the 8-4 second-room hidden coin reveals a foothold for the exit pipe',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='8-4')!);
 const area=level.areas.find(a=>a.id==='area-2')!;
 level.main=area.id;area.spawn=[608,208];area.camera=496;area.enemies=[];area.generators=[];
 const sim=new Simulation([level]);sim.reset(true);
 assert.equal(sim.tiles.get('38,9'),95);
 sim.step(['a'],24);
 assert.equal(sim.tiles.get('38,9'),196);
 assert.equal(sim.coins,1);
 sim.step([],40);sim.step(['a'],24);
 assert.equal(sim.coins,1,'the used block must not award another coin');
});

// Native branching probe from the 8-4 route (row 76400 on, jumps delayed and held differently; x is minus the area's 1792). The head is inside block row 9 from feet 173, the block column starts at
// x 600, but a hidden block is not hit while feet & 15 < 4 (feet 160..162 pass): it is hit at feet 159 or 158, turns solid in the same row, pushes Mario out 1 px per row and he drops past it.
const seedRun=(x:number,y:number,vy:number,speed:number,landJump:string,frames:string[][])=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='8-4')!);
 const area=level.areas.find(a=>a.id==='area-2')!;
 level.main=area.id;area.spawn=[Math.floor(x),Math.floor(y)];area.camera=480;area.enemies=[];area.generators=[];
 const sim=new Simulation([level]) as any;sim.reset(true);sim.phase='play';sim.phaseFrame=0;
 Object.assign(sim.player,{x,y,vy,vx:speed/4096,grounded:false});
 Object.assign(sim,{jumpArc:true,runJump:true,landJump,airRunning:true});sim.motor.speed=speed;sim.motor.airRun=true;
 sim.inputs=[new Set(frames[0]),new Set(frames[0])];sim.previous=new Set(frames[0]);
 const rows:number[][]=[];for(const b of frames){sim.step(b,1);rows.push([Math.floor(sim.player.x),Math.floor(sim.player.y)]);}
 return {sim,rows};
};
test('a jump released before the 8-4 hidden block reveals it at feet 159 (native rows 76446-76456)',()=>{
 const {sim,rows}=seedRun(598.125,165.4375,-2.625,10304,'released',Array.from({length:11},()=>[]));
 assert.deepEqual(rows,[[600,162],[603,160],[604,159],[603,159],[602,159],[601,161],[600,162],[599,165],[599,168],[599,171],[599,175]]);
 assert.equal(sim.tiles.get('38,9'),196);
});
test('a held jump reveals the 8-4 hidden block at feet 158 and keeps the fraction after gravity (native rows 76446-76453)',()=>{
 const {rows}=seedRun(598.125,165.03125,-3.4375,10248,'held',Array.from({length:8},()=>['right','a','b']));
 assert.deepEqual(rows,[[600,161],[602,158],[601,159],[600,160],[599,162],[598,165],[598,168],[598,172]]);
});

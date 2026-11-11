import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Level,Tile} from '../src/types.js';

function game(playerX=40){
 const tiles:Tile[]=Array.from({length:60},(_,x)=>[x,13,84]);
 const level:Level={id:'plant-fixture',time:400,main:'main',evidence:'Isolated measured plant cycle, not a campaign run.',areas:[{id:'main',width:960,palette:0,theme:'underground',tiles,enemies:[{kind:'piranha',x:240,y:184,phase:0,spawnCamera:0}],spawn:[playerX,208],evidence:'Explicit retract-phase anchor; pipe top160/hidden foot184.'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('Piranha retracts and rises at0.5px/frame with the measured220-frame cycle',()=>{
 const sim=game(),plant=sim.enemies[0];
 for(const [frame,foot]of [[8,164],[15,167.5],[48,184],[110,184],[111,184],[119,180],[159,160],[219,160],[220,160],[228,164]]){
  sim.step([],frame-sim.frame);assert.equal(plant.y,foot);
 }
});

test('a nearby player lets an exposed plant retract, inhibits its next rise at32px, and allows33px',()=>{
 const sim=game(208),plant=sim.enemies[0];
 sim.step([],48);assert.equal(plant.y,184);
 sim.step([],600);assert.equal(plant.y,184);
 sim.player.x=207;sim.step([],2);assert.ok(plant.y<184);
});

test('the observed4-2 tall-pipe plant retracts behind its reconstructed pipe top',()=>{
 const levels=structuredClone(observedLevels()),level=levels.find(l=>l.id==='4-2')!;
 const area=level.areas.find(a=>a.id==='area-3')!,spec=area.enemies.find(e=>e.kind==='piranha'&&e.x===1256)!;
 // Native rows (plant object x 1256 = pipe left 1248 + 8, Mario standing on the pipe top x 1267-1279, Buzzy Beetle turning at x 1279) put this pipe one tile left of the
 // screenshot-era 1264 and its top on the grid (data/native-geometry-corrections.json).
 assert.equal(spec.y,120);assert.ok(area.tiles.some(t=>t[0]===78&&t[1]===6&&t[2]===16)&&area.tiles.some(t=>t[0]===79&&t[1]===6&&t[2]===17));
 area.enemies=[{...spec,phase:0}];area.generators=[];area.firebars=[];area.cannons=[];
 const sim=new Simulation(levels);sim.reset(true);sim.levelIndex=levels.indexOf(level);sim.loadArea('area-3',[1224,144],1146);
 const plant=sim.enemies[0];sim.step([],48);assert.equal(plant.y,120);
 sim.step([],300);assert.equal(plant.y,120);assert.equal(sim.phase,'play');
});

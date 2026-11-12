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

// Native MovePiranhaPlant (tests/native-piranha.test.ts replays it on every recorded frame): the plant is made hidden, rises 1 px on odd FrameCounter rows
// to 24 px above, waits 0x40 frames, sinks back, waits 0x40 frames; a hidden plant does not start rising while Mario is within 0x20 px.
test('Piranha rises 24 px at 1 px per odd frame, waits 64 frames, sinks back and waits again',()=>{
 const sim=game(),plant=sim.enemies[0];
 const ys:number[]=[];for(let f=0;f<260;f++){sim.step([],1);ys.push(plant.y);}
 const top=ys.indexOf(160),bottom=ys.indexOf(184,top);
 assert.ok(plant.active&&top>0&&bottom>top);
 assert.equal(Math.min(...ys),160);assert.equal(ys.slice(top,top+64).every(y=>y===160),true);
 assert.equal(bottom-top,64+46,'the arrival row and 63 waiting rows (0x40), then 24 one-pixel steps on odd rows');
});

test('a nearby player keeps a hidden plant in its pipe while |dx| < 0x21 and lets it rise at 0x21',()=>{
 const sim=game(208),plant=sim.enemies[0];
 sim.step([],300);assert.equal(plant.y,184);
 sim.player.x=207;sim.step([],3);assert.ok(plant.y<184);
});

test('the observed4-2 tall-pipe plant retracts behind its reconstructed pipe top',()=>{
 const levels=structuredClone(observedLevels()),level=levels.find(l=>l.id==='4-2')!;
 const area=level.areas.find(a=>a.id==='area-3')!,spec=area.enemies.find(e=>e.kind==='piranha'&&e.x===1256)!;
 // Native rows (plant object x 1256 = pipe left 1248 + 8, Mario standing on the pipe top x 1267-1279, Buzzy Beetle turning at x 1279) put this pipe one tile left of the
 // screenshot-era 1264 and its top on the grid (data/native-geometry-corrections.json).
 assert.equal(spec.y,120);assert.ok(area.tiles.some(t=>t[0]===78&&t[1]===6&&[16,18].includes(t[2]))&&area.tiles.some(t=>t[0]===79&&t[1]===6&&[17,19].includes(t[2])));
 area.enemies=[{...spec,phase:0}];area.generators=[];area.firebars=[];area.cannons=[];
 const sim=new Simulation(levels);sim.reset(true);sim.levelIndex=levels.indexOf(level);sim.loadArea('area-3',[1224,144],1146);
 const plant=sim.enemies[0];sim.step([],48);assert.equal(plant.y,120);
 sim.step([],300);assert.equal(plant.y,120);assert.equal(sim.phase,'play');
});

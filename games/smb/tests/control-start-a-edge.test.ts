import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation} from '../src/simulation.js';
import type {Level} from '../src/types.js';
const levels=JSON.parse(fs.readFileSync('data/levels.json','utf8')) as Level[];
// Native free-play rows (model-play explore-r3 4-3/mood1, pad bit 16 = A): A held from 10 rows before control (rows 1804-1826) -> first control row 1814
// (x40 y80), y 80,80,76,72,68: the jump leaves the ground two rows after control starts, with no release edge, the same row as an A first pressed on the
// control row. An A pressed before control only (1-3/mood0, pad 5 = A, rows 6 on none) gives no jump.
// Through the real title -> intro -> play path (reset(true) starts in play and never holds A through a load).
function firstJumpRow(holdThroughLoad:boolean){
 const sim=new Simulation(levels);sim.reset(false);sim.step(['start'],1);
 for(let n=0;sim.phase!=='play'&&n<600;n++)sim.step(holdThroughLoad?['a']:[],1);
 assert.equal(sim.phase,'play');
 for(let row=0;row<10;row++){sim.step(['a'],1);if(sim.player.y<208)return row;}
 return Infinity;
}
test('an A held through the load jumps on the same control row as an A first pressed on the first control row',()=>{
 const pressed=firstJumpRow(false),held=firstJumpRow(true);
 assert.ok(Number.isFinite(held),'held A never jumped');
 assert.equal(held,pressed);
});
test('an A released before control does not jump on its own',()=>{
 const sim=new Simulation(levels);sim.reset(false);sim.step(['start'],1);
 for(let n=0;sim.phase!=='play'&&n<600;n++)sim.step(n<100?['a']:[],1);
 for(let i=0;i<10;i++)sim.step([],1);
 assert.ok(sim.player.grounded&&sim.player.y>=208);
});

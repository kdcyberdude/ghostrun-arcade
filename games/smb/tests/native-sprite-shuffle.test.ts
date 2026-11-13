import {test} from 'node:test';import assert from 'node:assert/strict';import {NativeSpriteShuffle} from '../src/native-sprite-shuffle.js';import data from './fixtures/native-sprite-shuffle.json';
test('native sprite OAM offsets follow every observed NMI shuffle and pause gate',()=>{
 assert.ok(data.checked>100000);for(const row of data.rows){const n=new NativeSpriteShuffle();Object.assign(n,structuredClone(row.before));if(!row.paused&&row.advance)n.step();assert.deepEqual({...n},row.after,`${row.level} frame${row.frame}`);if(row.advance&&!row.paused)assert.deepEqual(Array.from({length:9},(_,slot)=>n.miscOffset(slot)),row.misc,`native misc OAM ${row.level}:${row.frame}`);}
});

import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import type {Button} from '../src/types.js';import replay from './fixtures/native-sprite-shuffle-runtime.json';
test('a full independent native replay keeps the sprite offset clock without per-frame RAM reseeding',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,replay.entrance);(sim as any).inputs=[];const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<replay.pads.length;f++){sim.step(buttons.filter((_,bit)=>replay.pads[f]&(1<<bit)),1);assert.deepEqual({...sim.spriteShuffle},replay.states[replay.frameStates[f]],`native OAM clock ${f}`);}
});

import {test} from 'node:test';import assert from 'node:assert/strict';
import {NativePalette} from '../src/native-palette.js';import data from './fixtures/native-palette-queue.json';
test('area parser selects native VRAM buffer2 and delays the queued palette',()=>{
 assert.ok(data.checked>10000);
 for(const e of data.events){const p=new NativePalette();p.reset(e.scroll,e.task,3);const selected=p.step(e.delta,4,e.remove);assert.deepEqual([p.scroll,p.task,selected],e.after,`${e.level}:${e.frame}`);assert.equal(p.draw,selected?3:4);}
});

import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import entry from './fixtures/native-palette-entry.json';import type {Button} from '../src/types.js';
test('the native first engine7 before input readiness runs ColorRotation after respawn',()=>{
 const s=new Simulation(observedLevels());s.reset(true);initializeEntrance(s,entry.entrance);s.step([],0);(s as any).inputs=[];
 const names:Button[]=['a','b','select','start','up','down','left','right'],rows=new Map(entry.rows.map(r=>[r[0],r]));
 for(let f=0;f<entry.pads.length;f++){s.step(names.filter((_,b)=>entry.pads[f]&(1<<b)),1);const row=rows.get(f);if(row){assert.equal(s.random.frame,row[1],`native counter ${f}`);assert.equal(s.colorRotations%6,row[2],`native palette ${f}`);}}
});

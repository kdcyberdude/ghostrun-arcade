import {test} from 'node:test';import assert from 'node:assert/strict';import {NativeHud,pendingHudFromRam} from '../src/native-hud.js';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import type {Button} from '../src/types.js';import data from './fixtures/native-hud-queue.json';
test('native initial PPU digits can differ from CPU digits while buffer1 waits behind buffer2',()=>{
 const p=data.heldProbe;assert.ok(p);const n=new NativeHud(),ram=new Uint8Array(Buffer.from(p.ram,'base64'));assert.equal(ram[0x773],6);n.seed(p.observed,pendingHudFromRam(ram,p.observed),true);n.step(true);assert.deepEqual(n.draw,p.observed);n.step(false);assert.deepEqual(n.draw,p.after);
});
test('a full independent replay keeps native HUD number packets with no later RAM/PPU corrections',()=>{
 const s=new Simulation(observedLevels());s.reset(true);const report=initializeEntrance(s,data.entrance);assert.equal(report.nativeHud,'observed PPU nametable');(s as any).inputs=[];assert.deepEqual(s.hud.draw,data.states[data.frameStates[0]]);const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<data.pads.length;f++){s.step(buttons.filter((_,bit)=>data.pads[f]&(1<<bit)),1);assert.deepEqual(s.hud.draw,data.states[data.frameStates[f+1]],`native PPU HUD picture${f+1}`);}
});
import loops from './fixtures/native-hud-loops.json';
test('native loopback keeps the palette/HUD parser clock on the same GameEngine row',()=>{
 for(const run of loops.runs){const s=new Simulation(observedLevels());s.reset(true);initializeEntrance(s,run.entrance);(s as any).inputs=[];const cases=new Map(run.cases.map(c=>[c.frame,c]));const buttons:Button[]=['a','b','select','start','up','down','left','right'];
  for(let f=0;f<run.pads.length;f++){s.step(buttons.filter((_,bit)=>run.pads[f]&(1<<bit)),1);const c=cases.get(f);if(c)assert.deepEqual({task:s.paletteClock.task,scroll:s.paletteClock.scroll},{task:c.task,scroll:c.scroll},`${run.level} native loop row${f}`);}
 }
});

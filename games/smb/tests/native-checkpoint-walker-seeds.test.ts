import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-checkpoint-walker-seeds.json';
for(const c of fixture.cases)test(`native checkpoint restores ${c.kind} state${c.actor.state} source${c.sourceFrame}`,()=>{
 const initial=new Uint8Array(gunzipSync(Buffer.from(c.initialRam,'base64')));assert.equal(createHash('sha256').update(initial).digest('hex'),c.initialRamSha256);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,c.receipt));const a=c.actor,e=sim.enemies.find((e:any)=>e.active&&e.enemySlot===a.slot);assert.ok(e);
 assert.deepEqual([e.x,e.y,e.vx,e.walkerState,e.shellTimer],[a.x,a.y,a.vx,a.state&7,a.timer]);assert.deepEqual(e.fall,{speed:a.speed,force:a.force,fraction:a.fraction});
 if(c.kind==='flat'){assert.equal(e.squashed,true);assert.equal(e.dead,1);assert.equal(e.shell,false);}else{assert.equal(e.shell,true);assert.equal(e.movingShell,Boolean(a.state&128));assert.equal(e.shellFalling,Boolean(a.state&64));}
});

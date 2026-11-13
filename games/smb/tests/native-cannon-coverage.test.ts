import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {nativeEntities,NATIVE_ENEMY_KIND} from '../tools/harness/native-entities.js';import fixture from './fixtures/native-cannon-five-two-window.json';
test('legacy native enemy comparison includes genuine ID51 cannon shots',()=>{
 const ram=new Uint8Array(gunzipSync(Buffer.from(fixture.snapshot.ram,'base64'))),row=fixture.rows.find(r=>r.frame===fixture.snapshot.frame)!;
 assert.equal(NATIVE_ENEMY_KIND[51],'bullet');assert.ok(row.cannons.length>0);
 for(const shot of row.cannons){assert.equal(ram[0x16+shot.slot],51);assert.ok(nativeEntities(ram).some(e=>e.kind==='bullet'&&e.x===Math.floor(shot.x)&&e.y===(shot.y-24&255)));}
});

test('source engine7 preload and engine8 ready visit cannons before normal controls, preserving the full timer history',async()=>{
 const {Simulation}=await import('../src/simulation.js'),{observedLevels}=await import('../src/levels.js'),{decodeEntrance,initializeEntrance}=await import('../tools/harness/native-entrance.mjs');const sim:any=new Simulation(observedLevels());sim.reset(true);const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64')));initializeEntrance(sim,decodeEntrance(unpack(fixture.initialRam),fixture.receipt));sim.step([],0);sim.inputs=[];
 const pads=unpack(fixture.pads),buttons=['a','b','select','start','up','down','left','right'] as const,rows=new Map(fixture.rows.map(r=>[r.frame,r]));
 for(let frame=0;frame<pads.length;frame++){sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);const row=rows.get(frame);if(!row)continue;assert.deepEqual(Array.from({length:6},(_,k)=>{const e=sim.cannonTable[k];return {x:e?.cannon.x??0,y:e?.cannon.y??0,timer:e?.timer??0};}),row.table,`table frame${frame}`);assert.deepEqual(sim.enemies.filter((e:any)=>e.nativeShot&&e.active&&!e.dead).map((e:any)=>({slot:e.enemySlot,x:e.x,y:e.y,frameTimer:e.cannonFrameTimer??0})),row.cannons,`shots frame${frame}`);}
});

import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import samples from './fixtures/native-water-object-cases.json';
const names=['a','b','select','start','up','down','left','right'] as const;
for(const c of samples.cases)test(`native optional water ${c.mode}: every Blooper/lift birth, slot, motor and injury follows source RAM`,()=>{
 const initial=zlib.gunzipSync(Buffer.from(c.initial,'base64')),pads=Buffer.from(c.pads,'base64'),rows=JSON.parse(zlib.gunzipSync(Buffer.from(c.rows,'base64')).toString());assert.equal(createHash('sha256').update(initial).digest('hex'),c.source.initialRamSha256);assert.equal(createHash('sha256').update(pads).digest('hex'),c.source.padsSha256);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,c.entrance));sim.step([],0);sim.inputs=[];
 let at=0,checked=0;const births=new Set<number>();
 for(let f=0;f<pads.length;f++){
  sim.step(names.filter((_,b)=>pads[f]&(1<<b)),1);if(rows[at]?.[0]!==f)continue;
  const [frame,engine,counter,offset,page,selected,x,y,camera,playerBox,slots]=rows[at++];
  assert.equal(sim.random.frame,counter,`FrameCounter ${frame}`);assert.equal(sim.area.theme,'water',`area ${frame}`);
  assert.deepEqual([sim.waterEnemyStream.offset,sim.waterEnemyStream.page,Number(sim.waterEnemyStream.selected)],[offset,page,selected],`cursor ${frame}`);
  assert.deepEqual([Math.floor(sim.player.x),(Math.floor(sim.player.y)-32)&255,Math.floor(sim.camera)],[x,y,camera],`Mario ${frame}`);assert.equal(Number(sim.phase==='dying'||sim.phase==='gameover'),Number(engine===11),`death ${frame}`);
  for(let slot=0;slot<5;slot++){
   const [flag,id,nx,ny,high,a,b,sub,d,e,timer,dir,collision]=slots[slot];if(!flag||![7,39,23].includes(id))continue;
   if(id===7){const actor=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&e.enemySlot===slot);assert.ok(actor,`Blooper slot${slot} ${frame}`);assert.equal(actor.kind,'blooper');
    assert.deepEqual([Math.floor(actor.x),Math.floor(actor.y)-24,actor.bloop.counter,actor.bloop.force,actor.bloop.timer,actor.bloop.dir],[nx,ny,a,d,timer,dir],`Blooper ${frame} slot${slot}`);assert.equal(sim.waterSlotXSpeed[slot],b,`058 ${frame} slot${slot}`);births.add(id);
   }else if(id===39){const platform=[...sim.platformSlots].find(([,s])=>s===slot)?.[0];assert.ok(platform,`lift slot${slot} ${frame}`);const p=sim.platformMotion.collisionPosition(platform,sim.platformFrame),v=sim.platformMotion.verticalState(platform,sim.platformFrame);
    assert.deepEqual([Math.floor(p.x),Math.floor(p.y),v.speed&255,sim.platformMotion.slotSpeedByte(platform,sim.platformFrame),sim.slotSub[slot],v.force,v.fraction],[nx,ny,a,b,sub,d,e],`lift ${frame} slot${slot}`);births.add(id);
   }else{const controller=sim.frenzyControllers.find((c:any)=>c.slot===slot);assert.ok(controller,`NoRun ${frame}`);assert.deepEqual([Math.floor(controller.x),controller.y,controller.yHigh??1],[nx,ny,high],`NoRun bytes ${frame}`);}
  }
  if(c.mode==='down-strokes'&&frame===2937){assert.equal(engine,11);assert.deepEqual(playerBox,[79,37,89,49]);assert.equal(slots[0][12],1);assert.equal(sim.collisionBits[0],1);}
  checked++;
 }
 assert.equal(checked,rows.length);assert.deepEqual([...births].sort((a,b)=>a-b),[7,39]);
});

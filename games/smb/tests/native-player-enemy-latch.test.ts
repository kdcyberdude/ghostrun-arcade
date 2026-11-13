import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {nativePlayerEnemyLatch,nativeNormalEnemyBox,nativeNormalContactStomps} from '../src/native-player-enemy-latch.js';import type {NativeBox} from '../src/native-misc.js';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import {nativeEntities,simEntities,unmatchedEntity} from '../tools/harness/native-entities.js';
import fixture from './fixtures/native-player-enemy-latch.json';import visit from './fixtures/native-koopa-restomp.json';
const payload=gunzipSync(Buffer.from(fixture.gzipBase64,'base64')),events=JSON.parse(payload.toString()) as {handler?:string;slot:number;x?:number;y?:number;camera?:number;before:string;after:string}[];
const raw=(s:string)=>new Uint8Array(Buffer.from(s,'base64')),unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64')));
test('actual native PlayerEnemyCollision preserves the latch on skipped/held calls and clears it on eligible separation',()=>{
 assert.equal(createHash('sha256').update(payload).digest('hex'),fixture.sha256);assert.equal(events.length,838);assert.equal(events.length,fixture.samples);let fallingContacts=0,separations=0;
 for(const e of events.filter(e=>e.handler!=='box')){const r=raw(e.before),a=raw(e.after),s=e.slot,n={bits:r[0x491+s]},offset=(s+1)*4;
  const action=nativePlayerEnemyLatch(n,{frame:r[9],engine:r[14],playerY:(r[0xb5]-1)*256+r[0xce],state:r[0x1e+s],offscreen:Boolean(r[0x3d8+s]),player:Array.from(r.slice(0x4ac,0x4b0)) as NativeBox,enemy:Array.from(r.slice(0x4ac+offset,0x4b0+offset)) as NativeBox,star:Boolean(r[0x79f])});
  assert.equal(n.bits,a[0x491+s],`state${r[0x1e+s]} bits${r[0x491+s]} frame${r[9]} engine${r[14]} offscreen${r[0x3d8+s]}`);
  if(action==='contact'&&(r[0x1e+s]===0||r[0x1e+s]===1)){const stomp=r[0x74e]!==0&&nativeNormalContactStomps(r[0x16+s],r[0xce],r[0xcf+s],(r[0x9f]<<24)>>24,r[0x791]);if(stomp){assert.equal(a[14],8);assert.equal(a[0x9f],252);assert.equal(a[0x1e+s],r[0x16+s]===14?0:4);if(r[0x16+s]===14)assert.equal(a[0x16+s],0);fallingContacts++;}else if(!r[0x79e])assert.equal(a[14],11);}if(action==='separate')separations++;
 }
 assert.ok(fallingContacts>0&&separations>0);
});
test('natural7-1 demotion separation and falling Koopa restomp match every prefix legacy field and native slot2 latch/box',()=>{
 const initial=unpack(visit.initialRam),rows=unpack(visit.ram),pads=unpack(visit.pads);for(const [data,sha]of [[initial,visit.initialRamSha256],[rows,visit.ramSha256],[pads,visit.padsSha256]] as const)assert.equal(createHash('sha256').update(data).digest('hex'),sha);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,visit.receipt));sim.step([],0);sim.inputs=[];const buttons=['a','b','select','start','up','down','left','right'],digits=(r:Uint8Array,p:number,n:number)=>Array.from(r.slice(p,p+n)).reduce((a,v)=>a*10+v,0);let koopa:any;
 for(let f=0;f<pads.length;f++){sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);const r=rows.subarray(f*2048,(f+1)*2048),prev=f?rows.subarray((f-1)*2048,f*2048):initial;
  assert.deepEqual([sim.player.dead,sim.time,sim.score,sim.coins,Math.floor(sim.camera),Math.floor(sim.player.x),Math.floor(sim.player.y)-32],[r[14]===11,digits(r,0x7f8,3),digits(r,0x7dd,6)*10,r[0x75e],r[0x71a]*256+r[0x71c],r[0x6d]*256+r[0x86],(r[0xb5]-1)*256+r[0xce]],`row${f} Mario/HUD`);
  assert.equal(unmatchedEntity(nativeEntities(r,prev),simEntities(sim)),undefined,`row${f} native enemies`);
  if(f>=436){const e=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&e.enemySlot===2);assert.ok(e);assert.equal(sim.collisionBits[2]&1,r[0x493]&1,`row${f} latch`);assert.deepEqual(sim.hammerPlayerBox,Array.from(r.slice(0x4ac,0x4b0)),`row${f} cachedPlayerBox`);
   assert.equal(r[0x49c],3);assert.deepEqual(nativeNormalEnemyBox(prev[0x70]*256+prev[0x89],(prev[0xb8]-1)*256+prev[0xd1],sim.camera),Array.from(r.slice(0x4b8,0x4bc)),`row${f} source pre-move control3 box`);
   if(f===437){koopa=e;assert.equal(e.kind,'koopa');}if(f===443){assert.equal(e,koopa);assert.ok(e.shell);assert.equal(e.walkerState,4);assert.deepEqual([e.x,e.y-24,sim.player.vy,sim.nativeStompTimer],[1013.5,168,-4,1]);}
  }
 }
 assert.equal(pads.length,450);
});

test('actual source GetEnemyBoundBox control3 uses masked offscreen gates and byte clamps',()=>{
 let count=0;for(const e of events.filter(e=>e.handler==='box')){const r=raw(e.after),box=nativeNormalEnemyBox(e.x!,e.y!,e.camera!),offset=(e.slot+1)*4;if(r[0x3d8+e.slot])assert.equal(box,undefined);else assert.deepEqual(box,Array.from(r.slice(0x4ac+offset,0x4b0+offset)),`x${e.x} y${e.y} cam${e.camera}`);count++;}assert.equal(count,54);
});

test('initial RAM supplies retained collision bits once, after the room is initialized',()=>{
 const initial=unpack(visit.initialRam);initial[0x491]=129;initial[0x493]=1;
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,visit.receipt));assert.deepEqual(sim.collisionBits,[129,0,1,0,0]);
});

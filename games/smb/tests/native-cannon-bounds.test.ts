import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';
import {nativeCannonOutside} from '../src/native-cannon.js';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-cannon-bounds.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
test('ID51 bounds match actual native instruction calls before horizontal motion',()=>{
 assert.equal(fixture.calls,3739);assert.equal(fixture.erasures,161);
 for(const e of fixture.cases){assert.equal(nativeCannonOutside(e.x+e.sub/256,e.camera),!e.afterFlag,`${e.level}:${e.frame}:${e.slot}`);assert.equal(e.afterX,e.x,'bounds never move the horizontal object');}
});
test('native cannon lifecycle preserves slots, positions and table timers through all three first extra-shot boundaries',()=>{
 const buttons=['a','b','select','start','up','down','left','right'];
 for(const p of fixture.prefixes){const initial=unpack(p.initialRam),ram=unpack(p.ram),pads=unpack(p.pads),sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,p.entrance));sim.step([],0);sim.inputs=[];
  for(let f=0;f<p.frames;f++){
   sim.step(buttons.filter((_,i)=>pads[f]&(1<<i)),1);const r=ram.subarray(f*2048,(f+1)*2048),native=[],model=[];
   for(let s=0;s<5;s++)if(r[15+s]&&r[22+s]===51)native.push([s,r[0x6e+s]*256+r[0x87+s],(r[0xb6+s]-1)*256+r[0xcf+s]]);
   for(const e of sim.enemies)if(e.active&&e.dead<90&&e.nativeShot&&!e.frenzy)model.push([e.enemySlot,Math.floor(e.x),Math.floor(e.y)-24]);
   assert.deepEqual(model.sort((a,b)=>a[0]-b[0]),native,`${p.id} row${f} cannon slot/x/y`);
   // Table equality here covers native active gameplay; screen/area-load table
   // clearing belongs to the separate load/parser contract. Actor rows above
   // remain compared throughout every retained prefix.
   if(r[0x770]!==1||r[0x772]!==3||r[14]!==8)continue;
   assert.deepEqual(Array.from({length:6},(_,k)=>sim.cannonTable[k]?.timer??0),Array.from(r.subarray(0x47d,0x483)),`${p.id} row${f} timer table`);
  }
 }
});

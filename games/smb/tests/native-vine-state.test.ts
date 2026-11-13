import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {NativeSpecialSlot} from '../src/native-special-slot.js';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences,strictSimCoverage} from '../tools/harness/native-strict-entities.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import fixture from './fixtures/native-vine-procedures.json';
const payload=gunzipSync(Buffer.from(fixture.gzipBase64,'base64')),events=JSON.parse(payload.toString()) as {procedure:string;slot:number;blockIndex:number;before:string;after:string}[];
const ram=(value:string)=>new Uint8Array(Buffer.from(value,'base64'));
test('actual native Setup_Vine retains every seeded primary Enemy_State and Y-high byte',()=>{
 assert.equal(createHash('sha256').update(payload).digest('hex'),fixture.sha256);assert.equal(events.length,126);assert.equal(events.length,fixture.samples);
 let count=0;
 for(const e of events.filter(e=>e.procedure==='Setup_Vine')){const before=ram(e.before),after=ram(e.after),n=new NativeSpecialSlot();Object.assign(n,{state:before[0x23],yHigh:before[0xbb],vineCount:before[0x398],vineHeight:before[0x399],vineStartY:before[0x39d],vineSlots:[]});
  n.claimVine(before[0x76+e.blockIndex]*256+before[0x8f+e.blockIndex],before[0xd7+e.blockIndex]);
  assert.deepEqual([n.flag,n.id,n.state,n.x,n.y,n.yHigh,n.vineCount,n.vineStartY,n.vineSlots[0]],[after[0x14],after[0x1b],after[0x23],after[0x73]*256+after[0x8c],after[0xd4],after[0xbb],after[0x398],after[0x39d],after[0x39a]]);
  const sim={enemies:[],items:[],area:{vines:[{}]},vines:[],specialSlot5:n},native=strictNativeEntities(after);
  assert.deepEqual(strictEntityDifferences(native,strictSimEntities(sim)).mismatches,[]);assert.deepEqual(strictSimCoverage(sim),[]);
  n.state^=1;assert.ok(strictEntityDifferences(native,strictSimEntities(sim)).mismatches.some(m=>m.code==='state'));count++;
 }
 assert.equal(count,36);
});
test('actual InitEnemyObject clears secondary state and JumpEngine leaves Block pointer index96',()=>{
 let count=0;
 for(const e of events.filter(e=>e.procedure==='InitEnemyObject')){const before=ram(e.before),after=ram(e.after),s=e.slot;assert.equal(e.blockIndex,96);
  assert.equal(after[0x1e+s],0,'InitEnemyObject writes0 before Setup_Vine');assert.equal(after[0xb6+s],before[0xb6+s],'Y-high retained');
  assert.deepEqual([after[0x6e+s],after[0x87+s],after[0xcf+s]],[before[0x76+96],before[0x8f+96],before[0xd7+96]],'source Block aliasesD6/EF/0137, not normal block0/1 or picture Y+48');
  assert.equal(after[0x39b],s);assert.equal(after[0x398],2);count++;
 }
 assert.equal(count,54);
});
test('actual source powerup author and erasure define the retained slot5 state lifecycle',()=>{
 let count=0;
 for(const e of events.filter(e=>e.procedure==='PwrUpJmp'||e.procedure==='EraseEnemyObject')){const before=ram(e.before),after=ram(e.after),n=new NativeSpecialSlot();Object.assign(n,{flag:before[0x14],id:before[0x1b],state:before[0x23],yHigh:before[0xbb]});
  if(e.procedure==='EraseEnemyObject')n.erase();else n.claimPowerup(0,0);
  assert.deepEqual([n.flag,n.state],[after[0x14],after[0x23]]);if(e.procedure==='EraseEnemyObject'){assert.equal(n.id,after[0x1b]);assert.equal(n.yHigh,after[0xbb]);}
  n.claimVine(128,144);assert.equal(n.state,after[0x23]);count++;
 }
 assert.equal(count,36);
});
test('ordered powerup writer and one-time initial RAM seed preserve primary vine state',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.specialSlot5.claimPowerup(128,136);sim.items=[{kind:'mushroom',x:128,y:144,life:100,nativePowerState:192}];sim.syncSpecialPowerup();assert.equal(sim.specialSlot5.state,192);sim.specialSlot5.claimVine(160,144);assert.equal(sim.specialSlot5.state,192);sim.syncSpecialPowerup();assert.equal(sim.specialSlot5.state,192,'replaced owner cannot author state');
 const before=ram(events[0].before),start=decodeEntrance(before,{level:'5-2'});assert.equal(start.specialSlot.state,before[0x23]);
 before[0x23]=192;assert.equal(decodeEntrance(before,{level:'5-2'}).specialSlot.state,192);
 const inactive=new NativeSpecialSlot();assert.equal(inactive.state,0);inactive.state=77;inactive.frenzyQueue=23;inactive.consumeFrenzy(5);assert.equal(inactive.state,0,'InitEnemyObject clears queued state');
});

test('a vine block replaces the existing powerup owner without erasing its retained state',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.levelIndex=sim.levels.findIndex((l:any)=>l.areas.some((a:any)=>a.blockContents?.some((b:any)=>b.kind==='vine')));const area=sim.level.areas.find((a:any)=>a.blockContents?.some((b:any)=>b.kind==='vine'));sim.loadArea(area.id);
 const block=area.blockContents.find((b:any)=>b.kind==='vine');sim.player.x=block.col*16;sim.specialSlot5.claimPowerup(128,136);sim.items=[{kind:'mushroom',x:128,y:144,life:100,nativePowerState:192}];sim.syncSpecialPowerup();
 sim.hitBlock(block.col,block.row,sim.tiles.get(`${block.col},${block.row}`));assert.equal(sim.specialSlot5.id,47);assert.equal(sim.specialSlot5.state,192);assert.equal(sim.items.filter((i:any)=>i.nativePowerState!==undefined).length,0);
});

test('naturally visited mood vine retains primary state through birth, growth and erasure',async()=>{
 const visit=(await import('./fixtures/native-vine-natural-visit.json',{with:{type:'json'}})).default;
 const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),initial=unpack(visit.initialRam),rows=unpack(visit.ram),pads=unpack(visit.pads);
 for(const [bytes,sha]of [[initial,visit.initialRamSha256],[rows,visit.ramSha256],[pads,visit.padsSha256]] as const)assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,visit.receipt));sim.step([],0);sim.inputs=[];const buttons=['a','b','select','start','up','down','left','right'];let active=0;
 for(let f=0;f<pads.length;f++){sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);const r=rows.subarray(f*2048,(f+1)*2048),n=sim.specialSlot5;
  if(active&&!(r[0x14]&&r[0x1b]===47))assert.deepEqual([n.flag,n.id,n.state],[r[0x14],r[0x1b],r[0x23]],`natural row${f} erased owner`);
  if(r[0x14]&&r[0x1b]===47){assert.deepEqual([n.flag,n.id,n.state,n.x,n.y,n.yHigh],[r[0x14],r[0x1b],r[0x23],r[0x73]*256+r[0x8c],r[0xd4],r[0xbb]],`natural row${f} primary anchor/state`);active++;}
 }
 assert.equal(active,46);
});

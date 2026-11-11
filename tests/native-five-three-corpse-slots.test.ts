import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native controlled save/load branches: Goomba state4 releases on the second shared21-frame tick, not22 frames after every stomp.
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/native-five-three-corpse-slots.json',import.meta.url),'utf8'));
for(const c of fixture.samples)test(`5-3 ${c.name}: corpse slot lasts from native${c.stomp} through the allocation pass on${c.release}`,()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-3')!);
 const sim:any=new Simulation([level]);sim.reset(true);
 const platform=sim.area.platforms.find((p:any)=>p.x===1466&&p.y===145);sim.area.platforms=[platform];sim.area.generators=[];sim.camera=1202;
 // Translate each observed clock case into this isolated platform column; the corpse must remain in the viewport.
 const corpse={...sim.makeEnemy({kind:'goomba',x:1248,y:96}),active:true,dead:1,squashed:true};
 const others=Array.from({length:4},(_,i)=>({...sim.makeEnemy({kind:'koopa',x:1250+i*20,y:208}),active:true}));sim.enemies=[corpse,...others];
 sim.frame=c.stomp-fixture.firstControl+1;sim.areaPlayFrame=sim.frame;sim.rememberPlatformCorpseSlot(corpse);
 sim.frame+=100;assert.equal(sim.holdsPlatformCorpseSlot(corpse),true,'world-clock freeze retains the slot even while transform frames pass');
 assert.equal(c.rows[0].timer,16);assert.equal(c.rows[1].timer,15,'first shared tick');assert.equal(c.rows.at(-1).clock,20,'native removal is on the next shared tick');
 for(let row=c.stomp;row<=c.release+1;row++){
  sim.frame=row-fixture.firstControl+1;sim.areaPlayFrame=sim.frame;sim.platformFrame=sim.frame;
  corpse.dead=row-c.stomp<40?row-c.stomp+1:100; // existing visual lifetime is independent of slot lifetime
  sim.gateNativePlatforms(row===c.stomp?1201:1202);
  if(row<=c.release)assert.equal(sim.platformMotion.waiting.has(platform),true,`native${row}: all slots still occupied at allocation`);
  else{assert.equal(sim.platformMotion.waiting.has(platform),false);assert.equal(sim.platformMotion.nativeStart.get(platform),sim.frame,'platform starts on the first allocation after cleanup');}
 }
});

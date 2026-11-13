/** Read-only cannon-only counterfactual for two combined-batch gate changes.
 * Restores only the pre8e012b8 bounds behavior; keeps all other current code.
 * Diagnostic frame selections are evidence windows, never runtime schedules.
 * npx tsx tools/harness/native-cannon-causal.ts --traces DIR --entrances DIR --out JSON
 */
import {parseArgs} from 'node:util';
import fs from 'node:fs';import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';import {strictCompare} from './native-strict.js';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.entrances||!a.out)throw Error('--traces --entrances --out required');
const root=a.traces,proto:any=Simulation.prototype,pass=proto.passNativeCannons,gone=proto.nativeBulletGone;
const results=[];
for(const enabled of [true,false]){proto.passNativeCannons=enabled?pass:function(){this.cannonStartX.clear();return pass.call(this)};proto.nativeBulletGone=enabled?gone:function(e:any){const next=e.x+(!e.nativeShot||e.age>1?Math.sign(e.vx)*1.5:0);return !e.frenzy&&next<this.camera-70||next>this.camera+329||e.y>280;};
 for(const id of ['8-2','7-1']){
 const dir=root+'/'+id,ram=fs.readFileSync(dir+'/ram.bin'),pads=fs.readFileSync(dir+'/pads.bin'),receipt=JSON.parse(fs.readFileSync(a.entrances+'/'+id+'/entrance.json','utf8')),entrance=decodeEntrance(fs.readFileSync(dir+'/initial.ram'),receipt),audit=strictCompare(entrance,pads,ram,id),sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,entrance);sim.step([],0);sim.inputs=[];const peeks=[];
 for(let f=0;f<Math.min(pads.length,id==='8-2'?1477:3654);f++){sim.step(['a','b','select','start','up','down','left','right'].filter((_,i)=>pads[f]&(1<<i)),1);if(id==='8-2'&&[1379,1380,1381,1449,1450,1451,1452,1453,1476].includes(f)||id==='7-1'&&[3649,3650,3651,3652,3653].includes(f)){const r=ram.subarray(f*2048,(f+1)*2048);peeks.push({frame:f,native:{level:`${r[0x75f]+1}-${r[0x75c]+1}`,mode:r[0x770],task:r[0x772],engine:r[14],counter:r[9],camera:r[0x71a]*256+r[0x71c],cannons:Array.from({length:6},(_,k)=>[r[0x46b+k]*256+r[0x471+k],r[0x47d+k]]),random:Array.from(r.subarray(0x7a7,0x7ae)),slots:Array.from({length:5},(_,s)=>({slot:s,flag:r[15+s],id:r[22+s],x:r[0x6e+s]*256+r[0x87+s]+r[0x401+s]/256,state:r[30+s]}))},sim:{phase:sim.phase,level:sim.level.id,area:sim.area.id,counter:sim.random.frame,camera:sim.camera,cannons:sim.cannonTable.map((c:any)=>c?[c.cannon.x,c.timer]:null),random:Array.from(sim.random.bytes),levelLoad:sim.levelLoad,deathLoad:sim.deathLoad,entryControlLocked:sim.entryControlLocked,autoWalk:sim.area.autoWalk,slots:sim.enemies.filter((e:any)=>e.active&&!e.slotFreed&&e.dead<100).map((e:any)=>({slot:e.enemySlot,kind:e.kind,x:e.x,bbCheck:e.bbCheck,dead:e.dead})),load:sim.nativeLoad,loadClock:sim.nativeLoadClock}});}}
 results.push({id,cannonFix:enabled,fields:audit.fields,coverage:audit.coverage,diagnostics:audit.diagnostics,samples:audit.samples.filter((s:any)=>id==='8-2'?s.frame>=1379&&s.frame<=1476:s.frame>=3649&&s.frame<=3653),peeks});
 }
}
proto.passNativeCannons=pass;proto.nativeBulletGone=gone;fs.writeFileSync(a.out,JSON.stringify(results,null,2)+'\n');

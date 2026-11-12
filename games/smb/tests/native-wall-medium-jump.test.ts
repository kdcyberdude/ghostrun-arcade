import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Independent retained native PPU runs. Each excerpt starts before a ground wall hit, then jumps from its kept sub-byte speed.
const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/native-wall-medium-jump.json',import.meta.url),'utf8'));
const keys=['up','down','left','right','a','b','start','select'] as const;
const buttons=(pad:number)=>keys.filter((_,i)=>pad&(1<<i));
for(const c of cases)test(`${c.level} medium wall-contact jump retains force96 (native ${c.sweep??'r8'} mood${c.mood} row${c.frame})`,()=>{
 const level=structuredClone(observedLevels().find(l=>l.id===c.level)!);
 const sim:any=new Simulation([level]);sim.reset(true);const a=c.rows[0];sim.loadArea(c.area,[a.x+a.subx/256,a.y+32],Math.max(0,a.x-112));
 sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;sim.enemies=[];
 const p=sim.player;Object.assign(p,{vx:a.vx/4096,vy:0,grounded:true,facing:1});
 sim.motor.reset(a.vx,1);sim.motor.moving=1;sim.inputs=[new Set(buttons(c.rows[1].pad)),new Set(buttons(c.rows[2].pad))];
 for(let i=1;i<c.rows.length;i++){
  sim.step(buttons(c.rows[Math.min(i+2,c.rows.length-1)].pad),1);
  if(i===1)assert.ok(Math.abs(Math.round(p.vx*4096))<256,'the preceding row hits the wall');
  if(i>=2){const n=c.rows[i];assert.equal(sim.fallGravity,96/256,`fall class on row${c.frame+i-2}`);assert.equal(p.y+(p.grounded?sim.landingFraction:0),n.y+32+n.suby/256,`exact y on row${c.frame+i-2}`);assert.equal(p.vy,n.vy+n.vyFrac/256,`exact vy on row${c.frame+i-2}`);}
 }
});

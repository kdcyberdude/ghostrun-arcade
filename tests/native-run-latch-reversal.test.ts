import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native 5-3 rows 43239-43251: B + left to speed -1100 (byte -5), then right only. The run step goes on for the same 9 rows after B is released although the press turned Mario around;
// speeds 152 304 532 760 988 1216 1444 1672 1900 2052 2204 2356. Row 43241 is +152 natively and +228 here: what picks the step right after a turnaround is unresolved (model rows show both).
test('a low-speed turnaround keeps the run step for the 9 rows after B is released (native 5-3 rows 43240-43251)',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-3')!);
 level.areas.find(a=>a.id==='main')!.enemies=[];
 const s=new Simulation([level]) as any;s.reset(true);s.loadArea('main',[1286,96],1200);s.phase='play';s.phaseFrame=0;
 Object.assign(s.player,{x:1286.3125,y:96,vx:-1100/4096,vy:0,grounded:true,facing:-1});
 Object.assign(s.motor,{speed:-1100,facing:-1,moving:-1,runGrace:9});
 s.inputs=[new Set(['right']),new Set(['right'])];s.previous=new Set(['left','b']);
 const speeds:number[]=[-1100];
 for(let i=0;i<12;i++){s.step(['right'],1);speeds.push(Math.round(s.player.vx*4096));}
 const steps=speeds.slice(1).map((v,i)=>v-speeds[i]);
 assert.equal(speeds[1],152);
 assert.deepEqual(steps.slice(2,9),Array(7).fill(228));
 assert.deepEqual(steps.slice(9),Array(3).fill(152));
});

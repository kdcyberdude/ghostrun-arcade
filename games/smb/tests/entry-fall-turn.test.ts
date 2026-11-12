import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import native from '../evidence/entryfall-left-native-rows-20261111.json';
import type {Button} from '../src/types.js';

// Native free-play rows (explore-r4 1-1/mood1): the 1-2 area-2 entry fall with Right held, then Left from the 22nd area row. Mario keeps facing right through
// the load, so once the speed has crossed zero every Left row steps 304 (facing and motion disagree), not 152. Pairing as in native-entry-timeline.test.ts:
// y of remake step t matches native row t, input-driven speed matches row t-1 (the remake's extra frame of input latency). These ppu-clock model rows capture the
// pad one frame earlier than the route's slice clock (campaign-compare LATENCY phase 0), so step t is fed pad t+1.
const keys:Button[]=['up','down','left','right','a','b'];
const pad=(mask:number)=>keys.filter((_,bit)=>mask&(1<<bit));

test('1-2 area-2 entry fall: a Left press mid-fall decelerates by 152 and then accelerates left by 304 per row, as native',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 sim.levelIndex=observedLevels().findIndex(l=>l.id==='1-2');sim.loadArea('area-2');sim.phase='play';sim.phaseFrame=0;
 const ys:number[]=[Math.floor(sim.player.y)-32],vxs:number[]=[Math.round(sim.player.vx*4096)];
 for(let t=1;t<native.pads.length;t++){sim.step(pad(native.pads[t+1]??0),1);ys.push(Math.floor(sim.player.y)-32);vxs.push(Math.round(sim.player.vx*4096));}
 const last=native.y.findIndex(y=>y===176);
 for(let t=0;t<=last;t++)assert.equal(ys[t],native.y[t],`row +${t}: y`);
 for(let t=18;t<native.pads.length-1;t++)assert.equal(vxs[t+1],native.vx[t],`row +${t}: speed`);
 assert.ok(native.vx.some(v=>v<=-3000),'the excerpt reaches a fast leftward speed');
});

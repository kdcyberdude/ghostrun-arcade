import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {playerCell} from '../src/player-cell.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import type {Button} from '../src/types.js';import data from './fixtures/native-player-flag-pose.json';
// The separate end-stage timing gap can leave phaseflag before native GameEngine5 ends;
// this graphics fixture covers actual handled flag rows, while strict boundary tools retain that gap.
test('native flag slide, reversal and castle walk use PlayerAnim cells and timers on every handled row',()=>{
 for(const c of data.cases){const s=new Simulation(observedLevels());s.reset(true);initializeEntrance(s,c.entrance);s.step([],0);(s as any).inputs=[];const rows=new Map(c.rows.map(r=>[r[0],r])),names:Button[]=['a','b','select','start','up','down','left','right'];let compared=0;assert.ok(c.rows.length>500);
  for(let f=0;f<c.pads.length;f++){s.step(names.filter((_,b)=>c.pads[f]&(1<<b)),1);const r=rows.get(f);if(!r||s.phase!=='flag')continue;compared++;const p=playerCell(s);assert.deepEqual([p.cell,p.facing,s.playerAnim.ctrl,s.playerAnim.timer,s.playerAnim.timerSet],[r[1],r[2],r[4],r[5],r[6]],`${c.level} native flag row${f}`);}assert.ok(compared>500);
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native 7-1 main pipe (x 1504, top y 160), r4 mood5 + branching probe from row 2394 (x 1486 y 117 falling):
// Down+Right held through the landing: row 2399 x 1493 y 127 vy 3, row 2400 lands at x 1495 and enters (engine 3). Same with Down+Left (x 1493).
// Right only until the landing (row 2400 x 1495 standing), then Down+Right: walks x 1496..1503 on the top and never enters; Down alone there enters.
function sim(x:number,y:number,vx:number,vy:number,grounded:boolean,held:('down'|'right'|'left')[]){
 const s=new Simulation([structuredClone(observedLevels().find(l=>l.id==='7-1')!)]);s.reset(true);s.step(held,3); // buttons already held (input latency)
 s.player.x=x;s.player.y=y;s.player.vx=vx;s.player.vy=vy;s.player.grounded=grounded;s.camera=1400;return s;
}
test('Down+Right held while landing on the down-pipe top enters it (native 7-1 r4 mood5 row 2400)',()=>{
 const s=sim(1493.9375,158.5,1.53,3.5,false,['down','right']);for(let i=0;i<3&&s.phase!=='pipe';i++)s.step(['down','right'],1);assert.equal(s.phase,'pipe');
});
test('Down+Right held while already standing on the pipe top does not enter (native probe rows 2401-2406)',()=>{
 const s=sim(1495.4375,160,1.4,0,true,['down','right']);for(let i=0;i<5;i++){s.step(['down','right'],1);assert.notEqual(s.phase,'pipe',`step ${i}`);}
});

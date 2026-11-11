import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native entry window (walk probe from the recorded route, Down pressed standing on the pipe top): Mario enters only with his x in
// [pipe centre - 12, pipe centre - 4], i.e. |x + 8 - centre| < 5. Native rows: 6-2 912: x 900..908 enter, 898/899/909 do not; 4-1 2128: 2119..2124
// enter, 2115 and 2126 do not; 8-1 1680: 1671..1676 enter, 1667 and 1678 do not (7-1 1504: 1497..1500 enter, 1502 does not). The remake used +-8.
for(const [id,centre,y] of [['6-2',912,128],['4-1',2128,144],['8-1',1680,144]] as const){
 test(`${id} down pipe at ${centre} is entered only within 4 px of its centre`,()=>{
  const outcome=(x:number)=>{
   const level=structuredClone(observedLevels().find(l=>l.id===id)!);
   const main=level.areas.find(a=>a.id==='main')!;main.spawn=[x,y];main.camera=x-100;
   const sim=new Simulation([level]);sim.reset(true);sim.enemies=[];sim.step(['down'],4);return sim.phase==='pipe';
  };
  for(const dx of [-12,-8,-4])assert.equal(outcome(centre+dx),true,`x ${centre+dx}`);
  for(const dx of [-14,-13,-3,-2])assert.equal(outcome(centre+dx),false,`x ${centre+dx}`);
 });
}

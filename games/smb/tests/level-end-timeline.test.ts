import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,FLAG_COMPLETION} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';

// Native castle mode2 timelines are verified exactly in native-victory-runtime.test.ts.

// Native tails (rows from the timer reaching 0 to the level load) of the no-firework flag levels: 1-1 160, 1-2 141, 2-2 141, 2-3 140, 3-1 151, 3-3 144, 4-1 140, 4-2 155
// (digits 5,0,4,0,0,2,8,0); a level ends 140..160 rows after the timer reaches 0 on a 21-row area-clock phase, never on a flat 160.
test('no-firework flag levels end 140-160 rows after the timer reaches 0, aligned to the 21-row area clock',()=>{
 assert.equal(FLAG_COMPLETION.fireworksEndInterval,21);assert.equal(FLAG_COMPLETION.noFireworksEndWait,140);
 const tiles:Tile[]=[];for(let x=0;x<40;x++)tiles.push([x,13,84]);tiles.push([6,12,97],[9,8,69],[10,8,69],[11,8,69],[11,12,82]);
 const exits=new Set<number>();
 for(let offset=0;offset<21;offset++){
  const level:Level={id:'1-1',time:341,main:'main',evidence:'Synthetic flag fixture',areas:[{id:'main',width:640,palette:0,theme:'ground',tiles,enemies:[],spawn:[80,208],exit:{x:104,doorX:160,kind:'flag'},evidence:'Synthetic flag fixture'}]};
  const next:Level={...level,id:'1-2',time:400,areas:[{...level.areas[0],spawn:[40,208],exit:undefined}]};
  const sim=new Simulation([level,next]);sim.reset(true);sim.areaFrame=offset;
  let zero:number|undefined,left:number|undefined;
  for(let frame=0;frame<1200&&left===undefined;frame++){
   sim.step(frame<40?['right','a','b']:[],1);
   if(sim.phase==='flag'&&sim.time===0&&zero===undefined)zero=sim.frame;
   if(sim.levelIndex===1)left=sim.frame;
  }
  assert.ok(zero!==undefined&&left!==undefined);const tail=left!-zero!;assert.ok(tail>=140&&tail<=160,`tail ${tail}`);exits.add(tail);
 }
 assert.ok(exits.size>=15,'the tail follows the area-clock phase (21 start phases give 21 tails)');
});

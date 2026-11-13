import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';

// Native castle mode2 timelines are verified exactly in native-victory-runtime.test.ts.

// Source timer6 expires on IntervalTimerControl; areaFrame has no role.
test('no-firework flag levels follow the native interval divider, independently of areaFrame',()=>{
 const tiles:Tile[]=[];for(let x=0;x<40;x++)tiles.push([x,13,84]);tiles.push([6,12,97],[9,8,69],[10,8,69],[11,8,69],[11,12,82]);
 const exits=new Set<number>();
 for(let offset=0;offset<21;offset++){
  const level:Level={id:'1-1',time:341,main:'main',evidence:'Synthetic flag fixture',areas:[{id:'main',width:640,palette:0,theme:'ground',tiles,enemies:[],spawn:[80,208],exit:{x:104,doorX:160,kind:'flag'},evidence:'Synthetic flag fixture'}]};
  const next:Level={...level,id:'1-2',time:400,areas:[{...level.areas[0],spawn:[40,208],exit:undefined}]};
  const sim=new Simulation([level,next]);sim.reset(true);sim.intervalControl=offset;sim.areaFrame=100+offset*3;sim.nativeCastleFlag={slot:0,x:160,y:144,task:0,state:0,interval:0,draw:false};
  let zero:number|undefined,left:number|undefined;
  for(let frame=0;frame<1200&&left===undefined;frame++){
   sim.step(frame<40?['right','a','b']:[],1);
   if(sim.phase==='flag'&&sim.time===0&&zero===undefined)zero=sim.frame;
   if(sim.levelIndex===1)left=sim.frame;
  }
  assert.ok(zero!==undefined&&left!==undefined);const tail=left!-zero!;assert.ok(tail>=140&&tail<=160,`tail ${tail}`);exits.add(tail);
 }
 assert.ok(exits.size>=15,'the tail follows the native21-row NMI divider');
});

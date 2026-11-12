import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,CASTLE_COMPLETION,FLAG_COMPLETION} from '../src/simulation.js';
import type {Area,Enemy,Level,Tile} from '../src/types.js';

// Native rows of the recorded winning route (area `levelend`; tools/campaign-compare.ts TRANSITIONS=2, native time digits from a --ram 9,2040-2042 trace).
function castleFixture(actorX:number){
 const tiles:Tile[]=[];for(let col=0;col<(actorX+256)/16;col++)tiles.push([col,13,84]);
 const area:Area={id:'main',width:actorX+256,palette:0,theme:'castle',tiles,enemies:[],spawn:[40,208],exit:{kind:'axe',x:56,y:192,retainerX:actorX},evidence:'Isolated cutscene fixture; not a campaign-win replay'};
 const level:Level={id:'1-4',time:255,main:'main',areas:[area],evidence:area.evidence};const sim=new Simulation([level]);sim.reset(true);return sim;
}

// 1-4 rows 8168..8176: x 2257 -> 2269 (1.5 px/frame from the first row of the rescue walk); then Mario stands in front of the retainer
// 54 (1-4), 61 (2-4), 53 (3-4), 55 (5-4), 59 (6-4), 55 (7-4) rows before the message text (task 3) starts.
test('castle rescue walk runs at 1.5 px/frame from its first row and Mario stands the native 53-61 rows before the message',()=>{
 const sim=castleFixture(2448);
 const boss:Enemy={kind:'bowser',x:100,y:300,vx:0,vy:0,active:true,dead:1,shell:false,movingShell:false,age:0,originX:100,originY:160,hp:5};
 sim.phase='castle';sim.castleStage='fall';sim.camera=2304;
 const state=sim as unknown as {castleScroll:number;castleBraking:boolean;castleFallingBosses:Enemy[]};state.castleScroll=2304;state.castleBraking=false;state.castleFallingBosses=[boss];
 sim.enemies=[boss];Object.assign(sim.player,{x:2255,y:100,vx:0,vy:0});
 sim.step([],1);assert.equal(sim.castleStage,'walk');
 const x0=sim.player.x;sim.step([],8);assert.ok(Math.abs(sim.player.x-x0-12)<=1,`walked ${sim.player.x-x0}`);
 let arrival:number|undefined,message:number|undefined;
 for(let frame=0;frame<700&&message===undefined;frame++){
  sim.step([],1);
  if(sim.castleStage==='walk'&&sim.castleArrivalFrame&&arrival===undefined)arrival=sim.castleArrivalFrame;
  if(sim.castleStage==='message')message=sim.castleArrivalFrame;
 }
 assert.ok(arrival!==undefined&&message!==undefined);
 const hold=message!-arrival!;assert.equal(hold,CASTLE_COMPLETION.arrivalHoldFrames);assert.ok(hold>=53&&hold<=61,`hold ${hold}`);
});

// Native tails (rows from the timer reaching 0 to the level load) of the no-firework flag levels: 1-1 160, 1-2 141, 2-2 141, 2-3 140, 3-1 151, 3-3 144, 4-1 140, 4-2 155
// (digits 5,0,4,0,0,2,8,0); a level ends 140..160 rows after the timer reaches 0 on a 21-row area-clock phase, never on a flat 160.
test('no-firework flag levels end 140-160 rows after the timer reaches 0, aligned to the 21-row area clock',()=>{
 assert.equal(FLAG_COMPLETION.fireworksEndInterval,21);assert.equal(FLAG_COMPLETION.noFireworksEndWait,140);
 const tiles:Tile[]=[];for(let x=0;x<40;x++)tiles.push([x,13,84]);tiles.push([6,12,97],[9,8,69],[10,8,69],[11,8,69]);
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

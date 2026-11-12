import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

function area(overrides:Partial<Area>={}):Area {
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,13,84]);
 return {id:'main',width:1024,palette:0,theme:'ground',tiles,enemies:[],spawn:[40,208],evidence:'Synthetic mechanic fixture, not an observed campaign layout',...overrides};
}
function game(areas:Area[],id='fixture') {
 const level:Level={id,time:400,main:areas[0].id,areas,evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('off-grid overlapping artwork supports both player and enemies at its actual height',()=>{
 const sim=game([area({freeTiles:[{x:31,y:157,id:81,palette:0},{x:39,y:157,id:81,palette:0}],enemies:[{kind:'goomba',x:33,y:155}]})]);
 sim.player.x=32;sim.player.y=154;sim.player.vy=3;sim.player.grounded=false;sim.player.invincible=30;
 sim.step([],4);assert.equal(sim.player.y,157);assert.equal(sim.enemies[0].y,157);
 assert.equal(sim.tileAt(53,158),81);assert.equal(sim.tileAt(55,158),0);
});

test('automatic entrance walk enters a real side pipe and preserves the current timer',()=>{
 const entry=area({autoWalk:true,pipes:[{x:160,y:208,direction:'right',to:'room',spawn:[128,0],camera:96}]});
 // The compiled side-pipe mouth tiles (28/31) are walk-through: native rows show the player walking from x=147 to 160 inside the pipe.
 entry.tiles.push([10,11,28],[10,12,31]);
 const sim=game([entry,area({id:'room',spawn:[32,0]})]);
 sim.step(['left'],160);assert.equal(sim.phase,'pipe');const remaining=sim.time;
 sim.step([],64);assert.equal(sim.area.id,'room');assert.equal(sim.camera,96);assert.ok(sim.player.y<100);
 assert.ok(sim.time<=remaining&&sim.time>=remaining-2);assert.ok(sim.events.includes('sfx_pipe'));
});

test('a spring compresses before launching and pressing jump during the compression increases its launch',()=>{
 function launch(held:boolean){
  const spring={x:40,y:200};const sim=game([area({springs:[spring]})]);sim.player.y=174;sim.player.vy=2;sim.player.grounded=false;
  let compressed=false,launched=false,minimum=208;
  for(let frame=0;frame<65;frame++){sim.step(held&&frame>=9?['a']:[],1);compressed ||= sim.springCompression(sim.area.springs![0])===2;if(sim.player.vy<-5)launched=true;if(launched)minimum=Math.min(minimum,sim.player.y);}
  assert.ok(compressed);assert.ok(launched);return minimum;
 }
 assert.ok(launch(true)<launch(false)-12);
});

test('a small player spring rebound keeps the jump pose without another jump sound',()=>{
 const sim=game([area({springs:[{x:40,y:200}]})]);
 sim.player.y=174;sim.player.vy=2;sim.player.grounded=false;
 let launched=false;
 for(let frame=0;frame<30;frame++){
  sim.step([],1);
  if(sim.player.vy<-5){
   launched=true;
   assert.equal(sim.locomotionPose.kind,'jump');
   assert.ok(!sim.events.includes('sfx_jump_small'));
   break;
  }
 }
 assert.ok(launched);
});

test('firebar collision includes its center and excludes a nonexistent extra terminal orb',()=>{
 const bar={x:100,y:202,length:2,speed:0};
 const outside=game([area({firebars:[bar]})]);outside.player.x=112;outside.step([],1);assert.equal(outside.phase,'play');
 const touching=game([area({firebars:[bar]})]);touching.player.x=92;touching.step([],1);assert.equal(touching.phase,'dying');
});

test('a lethal firebar contact cannot also trigger an overlapping exit or pipe',()=>{
 const bar={x:100,y:202,length:2,speed:0};
 for(const destination of [
  {exit:{kind:'axe' as const,x:100,y:192,retainerX:240}},
 {pipes:[{x:100,y:208,direction:'down' as const,to:'room',spawn:[40,208] as [number,number]}]},
 ]){
  const setup=(lethal:boolean)=>{
   const sim=game([area({theme:'castle',firebars:lethal?[bar]:[],...destination}),area({id:'room'})]);
   sim.step(['down'],2);sim.player.x=92;sim.step(['down'],1);return sim;
  };
  const control=setup(false);assert.ok(control.phase==='castle'||control.phase==='pipe');
  const sim=setup(true);
  assert.equal(sim.phase,'dying');assert.equal(sim.player.dead,true);
  assert.ok(sim.events.includes('event_death'));assert.ok(!sim.events.includes('sfx_pipe'));
 }
});

test('crossing beneath an axe cannot clear a castle; touching it starts sequential bridge removal',()=>{
 const room=area({theme:'castle',exit:{kind:'axe',x:100,y:144,retainerX:240},enemies:[{kind:'bowser',x:200,y:160}]});
 room.tiles.push([12,10,137],[13,10,137],[14,10,137],[6,9,197]);
 const below=game([room]);below.player.x=100;below.step(['right'],10);assert.equal(below.phase,'play');
 const touching=game([room]);touching.player.x=86;touching.player.y=152;touching.player.vy=0;touching.step([],1);
 assert.equal(touching.phase,'castle');assert.equal(touching.tiles.get('14,10'),137);assert.equal(touching.enemies[0].dead,0);
 touching.step([],16);assert.equal(touching.tiles.has('14,10'),false);assert.equal(touching.tiles.get('12,10'),137);
 touching.step([],8);assert.equal(touching.castleStage,'fall');assert.ok(touching.enemies[0].dead>0);
 touching.step([],300);assert.equal(touching.castleStage,'message');assert.ok(touching.player.x>=218&&touching.player.x<=226);assert.ok(touching.castleArrivalFrame>0);
});

test('castle completion walks to the observed retainer before advancing to the next level',()=>{
 const first:Level={id:'1-4',time:400,main:'main',evidence:'Fixture',areas:[area({theme:'castle',exit:{kind:'axe',x:56,y:192,retainerX:128}})]};
 const second:Level={id:'2-1',time:400,main:'main',evidence:'Fixture',areas:[area()]};
 const sim=new Simulation([first,second]);sim.reset(true);sim.step(['right'],20);assert.equal(sim.phase,'castle');
 sim.step([],50);assert.equal(sim.levelIndex,0);sim.step([],500);assert.equal(sim.levelIndex,1);assert.notEqual(sim.phase,'ending');
});

test('castle rescue freezes the remaining timer without a flagpole score bonus',()=>{
 const first:Level={id:'1-4',time:252,main:'main',evidence:'Timer behavior fixture',areas:[area({theme:'castle',exit:{kind:'axe',x:56,y:192,retainerX:128}})]};
 const second:Level={id:'2-1',time:400,main:'main',evidence:'Fixture',areas:[area()]};
 const sim=new Simulation([first,second]);sim.reset(true);sim.step(['right'],20);assert.equal(sim.phase,'castle');
 const time=sim.time,score=sim.score;sim.step([],200);assert.equal(sim.castleStage,'message');
 sim.step([],100);assert.equal(sim.time,time);assert.equal(sim.score,score);assert.equal(sim.levelIndex,0);
 sim.step([],200);assert.equal(sim.levelIndex,1);assert.equal(sim.score,score);
});

test('the final rescue brakes naturally before the Princess and ends at the final camera view',()=>{
 const sim=game([area({theme:'castle',exit:{kind:'axe',x:56,y:192,retainerX:180}})],'8-4');
 sim.step(['right'],20);sim.step([],160);assert.equal(sim.phase,'ending');assert.ok(sim.player.x>=158&&sim.player.x<=166);assert.equal(sim.camera,36);
});

test('flying fish and bullets are generated over time rather than all existing at the start',()=>{
 const setup=()=>game([area({generators:[{kind:'flyingFish',from:0,to:1024,interval:12},{kind:'bullet',from:0,to:1024,interval:18}]})]);
 const a=setup(),b=setup();assert.equal(a.enemies.length,0);a.step([],36);for(let frame=0;frame<36;frame++)b.step([],1);
 assert.equal(a.enemies.filter(e=>e.kind==='cheep').length,3);assert.equal(a.enemies.filter(e=>e.kind==='bullet').length,2);
 assert.deepEqual(a.enemies,b.enemies);assert.ok(a.enemies.some(e=>e.motion==='flying'&&e.vy<0));
});

test('an active Lakitu drops a falling Spiny through the ordinary enemy update',()=>{
 const sim=game([area({enemies:[{kind:'lakitu',x:280,y:64}]})]);sim.step([],70);
 const spiny=sim.enemies.find(e=>e.kind==='spiny');assert.ok(spiny);assert.equal(spiny.motion,'falling');assert.ok(spiny.y>64);assert.equal(sim.phase,'play');
});

test('explicit maze gates stream a wrong corridor while accepting a matching corridor',()=>{
 const maze={loopAt:512,loopTo:384,evidence:'Synthetic gate test; not campaign maze evidence',gates:[{from:80,to:112,minFeetY:64,maxFeetY:120}]};
 const wrongArea=area({maze});wrongArea.tiles.push([24,5,136]);
 const wrong=game([wrongArea]);wrong.step(['right','b'],100);assert.ok(wrong.player.x>160);assert.equal(wrong.area.width,1152);assert.equal(wrong.tiles.get('32,5'),136);
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,6,84]);
 const correct=game([area({maze,tiles,spawn:[40,96]})]);correct.step(['right','b'],100);assert.ok(correct.player.x>160);assert.equal(correct.player.y,96);assert.equal(correct.area.width,1024);
});

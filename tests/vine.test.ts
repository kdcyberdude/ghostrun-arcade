import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

function area(overrides:Partial<Area>={}):Area {
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,13,84]);
 return {id:'main',width:1024,palette:0,theme:'ground',tiles,enemies:[],spawn:[80,208],evidence:'Synthetic vine fixture, not a campaign route',...overrides};
}
function game(areas:Area[]){
 const level:Level={id:'fixture',time:400,main:areas[0].id,areas,evidence:'Mechanic regression only'};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
const stem={id:'sky-vine',x:80,baseY:144,topY:48,evidence:'Synthetic geometric test'};

test('a vine-entry sky room selects cloud music and restores it after Star power',()=>{
 const sky=area({id:'sky',vines:[{...stem,initialHeight:96}],entryVine:{vineId:stem.id,untilFeetY:80,evidence:'Synthetic sky entry'}});
 const sim=game([area(),sky]);sim.events=[];sim.loadArea('sky');
 assert.ok(sim.events.includes('music_cloud'));
 sim.events=[];sim.player.star=1;sim.step([],1);assert.ok(sim.events.includes('music_cloud'));
 sim.events=[];sim.loadArea('main');assert.ok(sim.events.includes('music_ground'));
});

test('only the explicit vine brick grows a stem when hit from below',()=>{
 const room=area({vines:[stem],blockContents:[{col:5,row:9,kind:'vine',vineId:stem.id}]});room.tiles.push([5,9,81]);
 const sim=game([room]);sim.step(['a'],40);
 assert.equal(sim.tiles.get('5,9'),196);assert.ok(sim.vines[0].height>0);assert.equal(sim.coins,0);assert.equal(sim.items.length,0);
 assert.equal(sim.events.filter(event=>event==='sfx_vine_grows').length,1);assert.ok(!sim.events.includes('sfx_powerup_appears'));
 const untouched=game([area({vines:[stem],tiles:[...room.tiles.filter(t=>t[0]!==5||t[1]!==9),[5,9,81]]})]);
 untouched.step(['a'],40);assert.equal(untouched.tiles.get('5,9'),81);assert.equal(untouched.vines[0].height,0);
 sim.step([],220);assert.equal(sim.vines[0].height,96);assert.equal(sim.area.id,'main');
});

test('holding up below the used block cannot grab the vine through solid artwork',()=>{
 const room=area({vines:[{...stem,initialHeight:96}]});room.tiles.push([5,9,196]);
 const sim=game([room]);sim.step(['up'],40);assert.equal(sim.player.climbing,false);assert.equal(sim.player.y,208);
});

test('up must touch a grown vine and cross its explicit height to enter the connected room',()=>{
 const vine={...stem,initialHeight:96,to:'sky',spawn:[64,200] as [number,number],camera:0,transitionFeetY:48};
 const main=area({spawn:[80,136],vines:[vine]});const sky=area({id:'sky',spawn:[64,200]});
 const sim=game([main,sky]);sim.step(['up'],25);
 assert.equal(sim.player.climbing,true);assert.equal(sim.area.id,'main');assert.ok(sim.player.y<120);
 sim.step([],4);const stopped=sim.player.y;sim.step([],12);assert.equal(sim.player.y,stopped);
 sim.step(['up'],100);assert.equal(sim.area.id,'sky');assert.equal(sim.lives,3);assert.ok(sim.time<400&&sim.time>390);
 const away=game([area({spawn:[16,136],vines:[vine]}),sky]);away.step(['up'],80);assert.equal(away.area.id,'main');assert.equal(away.player.climbing,false);
});

test('jumping away releases a vine until up is released instead of immediately reattaching',()=>{
 const sim=game([area({spawn:[80,136],vines:[{...stem,initialHeight:96}]})]);sim.step(['up'],8);
 assert.equal(sim.player.climbing,true);sim.step(['up','a'],8);assert.equal(sim.player.climbing,false);assert.ok(sim.player.vy<0);
 sim.step([],4);sim.step(['up'],4);assert.equal(sim.player.climbing,true);
});

test('falling through a declared sky-room boundary returns without losing a life or resetting time',()=>{
 const sky=area({id:'sky',tiles:[],spawn:[40,224],fallExit:{belowY:256,to:'main',spawn:[400,80],camera:320,evidence:'Synthetic fall return'}});
 const main=area();const sim=game([sky,main]);sim.step([],20);
 assert.equal(sim.area.id,'main');assert.equal(sim.camera,320);assert.equal(sim.player.x,400);assert.equal(sim.lives,3);assert.equal(sim.phase,'play');assert.ok(sim.time>=399);
 const noReturn=game([area({tiles:[],spawn:[40,224]})]);noReturn.step([],30);assert.equal(noReturn.phase,'dying');
});

test('a grown vine and its used brick survive a geometric room return',()=>{
 const main=area({vines:[stem],blockContents:[{col:5,row:9,kind:'vine',vineId:stem.id}]});main.tiles.push([5,9,81]);
 const sim=game([main,area({id:'sky'})]);sim.step(['a'],40);const height=sim.vines[0].height;
 sim.loadArea('sky');sim.loadArea('main');assert.equal(sim.tiles.get('5,9'),196);assert.equal(sim.vines[0].height,height);
 sim.step([],20);assert.ok(sim.vines[0].height>height);
});

test('an explicit sky entrance climbs to its geometric release height before accepting lateral input',()=>{
 const sim=game([area({spawn:[64,240],vines:[{id:'entry',x:64,baseY:272,topY:144,initialHeight:128,evidence:'Synthetic entry stem'}],entryVine:{vineId:'entry',untilFeetY:184,evidence:'Synthetic entry bound'}})]);
 sim.step(['right','a'],40);assert.equal(sim.player.climbing,true);assert.ok(sim.player.y<220&&sim.player.y>184);const x=sim.player.x;
 sim.step(['right','a'],24);assert.equal(sim.player.climbing,false);assert.equal(sim.player.y,184);
 sim.step(['right'],8);assert.ok(sim.player.x>x);assert.ok(sim.player.y>=184);
});

test('crossing the main-vine automatic-climb bound continues under neutral or down until the exit boundary',()=>{
 const vine={...stem,topY:-24,initialHeight:168,autoClimbFeetY:64,transitionFeetY:0,to:'sky',spawn:[64,240] as [number,number]};
 const sim=game([area({spawn:[73,70],vines:[vine]}),area({id:'sky',spawn:[64,240]})]);
 sim.step(['up'],12);assert.equal(sim.area.id,'main');assert.ok(sim.player.y<64);const y=sim.player.y,time=sim.time,timerFrames=sim.timerFrames;
 sim.step(['down','right','a'],20);assert.ok(sim.player.y<y-15);assert.equal(sim.player.climbing,true);assert.equal(sim.area.id,'main');
 assert.equal(sim.time,time);assert.equal(sim.timerFrames,timerFrames);
 sim.step([],60);assert.equal(sim.area.id,'sky');assert.equal(sim.lives,3);
});

test('a zero-height sky vine grows before emergence, then climbs, passes right and lands under neutral controls',()=>{
 const tiles:Tile[]=[];for(let x=0;x<16;x++)if(x!==4)tiles.push([x,13,136]);
 const sim=game([area({tiles,spawn:[56,240],vines:[{id:'entry',x:64,baseY:256,topY:144,initialHeight:0,evidence:'Observed sky-entry geometry; stage thresholds inferred'}],entryVine:{vineId:'entry',untilFeetY:184,waitUntilGrowthComplete:true,exitRightX:75,exitGroundFeetY:208,evidence:'Observed neutral-entry sequence; side-passage speed inferred'}})]);
 assert.equal(sim.vines[0].growing,true);assert.equal(sim.vineEntryStage,'grow');
 sim.step(['left','down','a'],200);assert.equal(sim.vines[0].height,100);assert.equal(sim.player.y,240);assert.equal(sim.player.x,56);assert.equal(sim.vineEntryStage,'grow');
 sim.step([],24);assert.equal(sim.vines[0].height,112);assert.equal(sim.vineEntryStage,'climb');assert.ok(sim.player.y<240);
 let sawRightSide=false,sawFall=false;
 for(let frame=0;frame<120&&sim.vineEntryStage;frame++){
  sim.step([],1);sawRightSide ||= Number(sim.player.x)===71&&sim.player.facing===-1&&sim.player.climbing;
  sawFall ||= sim.vineEntryStage==='fall'&&sim.player.y>184&&sim.player.y<208;
 }
 assert.ok(sawRightSide);assert.ok(sawFall);assert.equal(sim.vineEntryStage,undefined);assert.equal(sim.player.x,75);assert.equal(sim.player.y,208);assert.equal(sim.player.grounded,true);assert.equal(sim.lives,3);
 assert.equal(sim.time,400);assert.equal(sim.timerFrames,0);sim.step([],1);assert.equal(sim.timerFrames,1);
});

test('the automatic sky landing requires actual cloud-floor collision',()=>{
 const sim=game([area({tiles:[],spawn:[56,240],vines:[{id:'entry',x:64,baseY:256,topY:144,initialHeight:112,evidence:'Synthetic missing-floor regression'}],entryVine:{vineId:'entry',untilFeetY:184,exitRightX:75,exitGroundFeetY:208,evidence:'No floor is supplied'}})]);
 for(let frame=0;frame<140&&sim.phase==='play';frame++)sim.step([],1);
 assert.equal(sim.phase,'dying');assert.ok(sim.player.y>272);assert.equal(sim.player.grounded,false);
});

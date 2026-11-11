import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation,CASTLE_COMPLETION} from '../src/simulation.js';
import {GameRenderer} from '../src/renderer.js';
import {observedLevels} from '../src/levels.js';
import type {Area,Enemy,Level,Tile} from '../src/types.js';

interface Row {nativeFrame:number;world:string;camera:number;cameraMethod:string;player:{x:number;feetY:number}|null;bowser:{feetY:number}|null;thankYou:boolean;terminal:boolean}
interface Fit {id:string;fraction:number;startFrame:number;initialFeetY:number}
const measured=JSON.parse(readFileSync(new URL('../data/castle-completion-measurements.json',import.meta.url),'utf8')) as {
 levels:{id:string;actorX:number;rows:Row[]}[];
 sharedFits:{braking:{brakeAtActorSeparation:number;fits:Fit[]}[];falling:{fits:Fit[]}[]};
};
function fixture(id:string,actorX:number){
 const tiles:Tile[]=[];for(let col=0;col<(actorX+256)/16;col++)tiles.push([col,13,84]);
 const area:Area={id:'main',width:actorX+256,palette:0,theme:'castle',tiles,enemies:[],spawn:[40,208],exit:{kind:'axe',x:56,y:192,retainerX:actorX},evidence:'Isolated cutscene kinematics fixture; not a campaign-win replay'};
 const level:Level={id,time:255,main:'main',areas:[area],evidence:area.evidence};const sim=new Simulation([level]);sim.reset(true);return sim;
}
function seedCutscene(sim:Simulation,stage:'fall'|'walk',camera:number){
 sim.phase='castle';sim.castleStage=stage;sim.camera=camera;
 const state=sim as unknown as {castleScroll:number;castleBraking:boolean;castleFallingBosses:Enemy[]};state.castleScroll=camera;state.castleBraking=false;return state;
}

// These isolate sections at measured image anchors. They verify the production
// cutscene rules; they are not ordinary-control complete campaign evidence.
for(const level of measured.levels)test(`${level.id}: production rescue walk/braking and independent camera fit native images within2px`,()=>{
 const fit=measured.sharedFits.braking.find(f=>f.brakeAtActorSeparation===48)!.fits.find(f=>f.id===level.id)!;
 const limit=level.rows.find(r=>r.thankYou||r.terminal)!.nativeFrame,rows=level.rows.filter(r=>r.world===level.id&&r.nativeFrame<limit&&r.player?.feetY===208&&r.player.x>=level.actorX-90),first=rows[0],sim=fixture(level.id,level.actorX);
 seedCutscene(sim,'walk',first.camera);Object.assign(sim.player,{x:first.player!.x+fit.fraction,y:208,vx:1.5,vy:0,grounded:true});let frame=first.nativeFrame;
 for(const row of rows){sim.step([],row.nativeFrame-frame);frame=row.nativeFrame;assert.ok(Math.abs(Math.floor(sim.player.x)-row.player!.x)<=2,`frame${frame}: Mario${sim.player.x}, native${row.player!.x}`);if(row.cameraMethod!=='held-last-known')assert.ok(Math.abs(sim.camera-row.camera)<=2,`frame${frame}: camera${sim.camera}, native${row.camera}`);}
});

for(const level of measured.levels)test(`${level.id}: production Bowser gravity/cap fit visible native fall within2px`,()=>{
 const fit=measured.sharedFits.falling[0].fits.find(f=>f.id===level.id)!,rows=level.rows.filter(r=>r.bowser&&r.nativeFrame>=fit.startFrame),sim=fixture(level.id,level.actorX);
 const boss:Enemy={kind:'bowser',x:100,y:fit.initialFeetY+fit.fraction,vx:0,vy:0,active:true,dead:1,shell:false,movingShell:false,age:0,originX:100,originY:160,hp:5};
 seedCutscene(sim,'fall',0).castleFallingBosses=[boss];sim.enemies=[boss];let frame=fit.startFrame;
 for(const row of rows){sim.step([],row.nativeFrame-frame);frame=row.nativeFrame;assert.ok(Math.abs(Math.floor(boss.y)-row.bowser!.feetY)<=2,`frame${frame}: Bowser${boss.y}, native${row.bowser!.feetY}`);}
});

test('axe contact holds the real airborne pose, removes rightmost bridge tiles every4frames, and waits during the fall',()=>{
 const sim=fixture('fixture',2448);sim.area.exit={kind:'axe',x:2264,y:128,retainerX:2448};for(let col=128;col<141;col++)sim.tiles.set(`${col},10`,137);
 sim.player.x=2255;sim.player.y=130;sim.player.vy=0;sim.camera=2023;sim.step([],1);assert.equal(sim.phase,'castle');assert.equal(sim.player.x,2255);assert.equal(sim.player.y,130);
 sim.step([],CASTLE_COMPLETION.collapseInitialWaitFrames);assert.equal(sim.tiles.has('140,10'),false);assert.equal(sim.tiles.get('139,10'),137);
 sim.step([],3);assert.equal(sim.tiles.get('139,10'),137);sim.step([],1);assert.equal(sim.tiles.has('139,10'),false);assert.equal(sim.player.x,2255);assert.equal(sim.player.y,130);
});

test('rescue text follows the final camera and the second line begins at128frames; terminal8-4 image has no dialogue',()=>{
 const sim=fixture('1-4',2448);sim.phase='castle';sim.castleStage='message';sim.camera=2305;sim.castleArrivalFrame=0;sim.phaseFrame=127;
 const calls:unknown[][]=[],renderer=Object.create(GameRenderer.prototype) as GameRenderer,view=renderer as unknown as {enemyCell:(...args:unknown[])=>void;text:(...args:unknown[])=>void;castleRescue:(s:Simulation)=>void};
 view.enemyCell=(...a)=>calls.push(['actor',...a]);view.text=(...a)=>calls.push(['text',...a]);view.castleRescue(sim);
 assert.ok(calls.some(c=>c[1]==='THANK YOU MARIO!'&&c[2]===63&&c[3]===80));assert.equal(calls.filter(c=>c[0]==='text').length,1);
 calls.length=0;sim.phaseFrame=128;view.castleRescue(sim);assert.ok(calls.some(c=>c[1]==='ANOTHER CASTLE!'&&c[2]===39));
 const final=fixture('8-4',912);final.phase='ending';final.phaseFrame=0;final.camera=767;calls.length=0;view.castleRescue(final);assert.equal(calls.filter(c=>c[0]==='text').length,0);assert.ok(calls.some(c=>c[0]==='actor'&&c[1]===26&&c[2]===145&&c[4]==='0f-16-30-27'));
});

test('all eight compiled rescue floors support Mario at the208px native height, including the corrected8-4 extent',()=>{
 const sim=new Simulation(observedLevels());
 for(const level of measured.levels){
  sim.reset(true);sim.levelIndex=sim.levels.findIndex(l=>l.id===level.id);const area=sim.level.areas.find(a=>a.exit?.kind==='axe')!;sim.loadArea(area.id);
  const final=level.rows.filter(r=>r.world===level.id&&r.player).at(-1)!;
  Object.assign(sim.player,{x:final.player!.x,y:208,vx:0,vy:0,grounded:true});sim.camera=final.camera;sim.enemies=[];sim.step([],4);assert.equal(sim.player.y,208,level.id);assert.equal(sim.player.grounded,true,level.id);
  if(level.id==='8-4'){assert.ok(sim.area.width>=1024);assert.equal(sim.tileAt(1023,220),98);}
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {GameRenderer} from '../src/renderer.js';
import {observedLevels} from '../src/levels.js';
import type {Area,Level,Tile} from '../src/types.js';

interface Row {nativeFrame:number;world:string;camera:number;cameraMethod:string;player:{x:number;feetY:number}|null;bowser:{feetY:number}|null;thankYou:boolean;terminal:boolean}
const measured=JSON.parse(readFileSync(new URL('../data/castle-completion-measurements.json',import.meta.url),'utf8')) as {
 levels:{id:string;actorX:number;rows:Row[]}[];
};
function fixture(id:string,actorX:number){
 const tiles:Tile[]=[];for(let col=0;col<(actorX+256)/16;col++)tiles.push([col,13,84]);
 const area:Area={id:'main',width:actorX+256,palette:0,theme:'castle',tiles,enemies:[],spawn:[40,208],exit:{kind:'axe',x:56,y:192,retainerX:actorX},evidence:'Isolated cutscene kinematics fixture; not a campaign-win replay'};
 const level:Level={id,time:255,main:'main',areas:[area],evidence:area.evidence};const sim=new Simulation([level]);sim.reset(true);return sim;
}
// Full native RAM trajectories replace the old screenshot-fitted kinematics
// checks in native-victory-runtime.test.ts (all mode2 rows, exact pixels).

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

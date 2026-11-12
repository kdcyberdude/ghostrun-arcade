import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation} from '../src/simulation.js';
import type {Button,CheckpointSpec,Level,Tile} from '../src/types.js';
const rules=JSON.parse(fs.readFileSync('data/checkpoint-rules.json','utf8')).checkpoints as (CheckpointSpec&{level:string;area:string})[];
const levels=JSON.parse(fs.readFileSync('data/levels.json','utf8')) as Level[];
const actions=JSON.parse(fs.readFileSync('data/observed-winning-inputs.json','utf8')).actions as [number,number][];
const cp=rules.find(r=>r.level==='1-1')!;
function fixture(enemyX=1456,bonus=false,checkpoint=cp){
 const width=Math.max(2000,checkpoint.activationX+512),tiles:Tile[]=Array.from({length:Math.ceil(width/16)},(_,x)=>[x,13,84]);
 const data:Level={id:'checkpoint-fixture',time:400,main:'main',evidence:'Synthetic isolated ordinary-controller collision fixture using a measured checkpoint connection',areas:[{id:'main',width,palette:0,theme:'ground',tiles,enemies:bonus?[]:[{kind:'goomba',x:enemyX,y:208,direction:-1,spawnCamera:enemyX-176}],spawn:[40,208],checkpoint:structuredClone(checkpoint),pipes:bonus?[{x:1456,y:208,direction:'right',to:'bonus',spawn:[40,208],camera:0,transitionFrames:64}]:[],evidence:'test'},{id:'bonus',width:512,palette:3,theme:'underground',tiles:tiles.filter(t=>t[0]<32),enemies:[{kind:'goomba',x:120,y:208,direction:-1}],spawn:[40,208],evidence:'test'}]};
 const sim=new Simulation([data]);sim.reset(true);return sim;
}
function dieByControls(sim:Simulation,buttons:Button[]=['right','b'],limit=1200){let frames=0;while(sim.phase==='play'&&frames++<limit)sim.step(buttons,1);assert.equal(sim.phase,'dying','ordinary movement must produce a real collision death');}
function respawn(sim:Simulation){let frames=0;while(sim.phase!=='play'&&frames++<1000)sim.step([],1);assert.equal(sim.phase,'play');assert.equal(sim.player.dead,false);}
function recordedPrefix(sim:Simulation,ticks:number,player=0){const names:Button[]=['up','down','left','right','a','b'];const step=(buttons:Button[],frames:number)=>player?sim.step([],frames,buttons):sim.step(buttons,frames);for(const[mask,frames]of actions.slice(0,ticks))step(names.filter((_,bit)=>mask&(1<<bit)),frames);for(let n=0;n<4;n++)step(['left','b'],actions[ticks+n][1]);}

test('ordinary enemy collision after activation returns to the observed spawn and camera',()=>{
 const sim=fixture();dieByControls(sim);assert.equal(sim.checkpoint,true);respawn(sim);
 assert.equal(sim.lives,2);assert.equal(sim.player.x,1320);assert.equal(sim.player.y,208);assert.equal(sim.camera,1280);assert.equal(sim.player.x-sim.camera,40);
});

test('ordinary collision before activation restarts at the level entrance',()=>{
 const sim=fixture(1300);dieByControls(sim);assert.equal(sim.checkpoint,false);respawn(sim);
 assert.equal(sim.lives,2);assert.equal(sim.player.x,40);assert.equal(sim.camera,0);
});

test('a checkpoint survives ordinary pipe entry and a genuine bonus-room enemy death',()=>{
 const sim=fixture(1456,true);let frames=0;
 while(sim.phase==='play'&&frames++<1000)sim.step(['right','b'],1);assert.equal(sim.phase,'pipe');assert.equal(sim.checkpoint,true);
 while(sim.phase==='pipe'&&frames++<1300)sim.step([],1);assert.equal(sim.area.id,'bonus');assert.equal(sim.area.checkpoint,undefined);
 dieByControls(sim,[]);respawn(sim);assert.equal(sim.area.id,'main');assert.equal(sim.player.x,cp.spawn[0]);assert.equal(sim.camera,cp.camera);
});

test('two-player handoff resets checkpoint eligibility for the next player',()=>{
 const sim=fixture();sim.reset();sim.step(['select'],1);sim.step([],1);sim.step(['start'],1);sim.step([],200);assert.equal(sim.twoPlayer,true);assert.equal(sim.phase,'play');
 dieByControls(sim);assert.equal(sim.checkpoint,true);respawn(sim);
 assert.equal(sim.currentPlayer,1);assert.equal(sim.checkpoint,false);assert.equal(sim.player.x,40);assert.equal(sim.camera,0);
});

test('each player retains their own checkpoint across two genuine death handoffs',()=>{
 const sim=new Simulation(levels);sim.twoPlayer=true;sim.reset(true);
 recordedPrefix(sim,77);dieByControls(sim,[],30000);assert.equal(sim.checkpoint,true);respawn(sim);
 assert.equal(sim.currentPlayer,1);assert.equal(sim.checkpoint,false);assert.equal(sim.camera,0);
 let frames=0;while(sim.phase==='play'&&frames++<300)sim.step([],1,['right','b']);
 assert.equal(sim.phase,'dying','Luigi must genuinely collide with the first enemy');respawn(sim);
 assert.equal(sim.currentPlayer,0);assert.equal(sim.lives,2);assert.equal(sim.checkpoint,true);
 assert.equal(sim.player.x,cp.spawn[0]);assert.equal(sim.camera,cp.camera);
 sim.reset(true);assert.equal(sim.currentPlayer,0);assert.equal(sim.checkpoint,false);assert.ok(sim.slots.every(slot=>!slot.checkpoint));
});

test('Luigi retains his own checkpoint while Mario restarts at the opening',()=>{
 const sim=new Simulation(levels);sim.twoPlayer=true;sim.reset(true);
 dieByControls(sim,['right','b'],300);respawn(sim);assert.equal(sim.currentPlayer,1);assert.equal(sim.checkpoint,false);
 recordedPrefix(sim,77,1);let frames=0;while(sim.phase==='play'&&frames++<30000)sim.step([],1,[]);
 assert.equal(sim.phase,'dying');assert.equal(sim.checkpoint,true);respawn(sim);
 assert.equal(sim.currentPlayer,0);assert.equal(sim.checkpoint,false);assert.equal(sim.camera,0);
 dieByControls(sim,['right','b'],300);respawn(sim);assert.equal(sim.currentPlayer,1);
 assert.equal(sim.checkpoint,true);assert.equal(sim.player.x,cp.spawn[0]);assert.equal(sim.camera,cp.camera);
});

test('each independently observed compiled connection restores its own spawn and camera after ordinary enemy contact',()=>{
 for(const rule of rules){const sim=fixture(rule.activationX+64,false,rule);dieByControls(sim);assert.equal(sim.checkpoint,true,rule.level);respawn(sim);assert.equal(sim.player.x,rule.spawn[0],rule.level);assert.equal(sim.player.y,rule.spawn[1],rule.level);assert.equal(sim.camera,rule.camera,rule.level);assert.equal(sim.player.x-sim.camera,40,rule.level);}
});

test('an interior checkpoint remembers its area after ordinary pipe entry and collision death',()=>{
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const checkpoint:CheckpointSpec={activationX:200,spawn:[120,208],camera:80,activationStatus:'inferred',activationBracket:[180,220],evidence:'Synthetic area-identity fixture; no native activation claim'};
 const data:Level={id:'interior-checkpoint-fixture',time:400,main:'outside',evidence:'Synthetic ordinary-controller pipe/collision fixture',areas:[{id:'outside',width:512,palette:0,theme:'ground',tiles,enemies:[],spawn:[40,208],pipes:[{x:160,y:208,direction:'right',to:'interior',spawn:[40,208],camera:0,transitionFrames:64}],evidence:'test'},{id:'interior',width:512,palette:3,theme:'underground',tiles,enemies:[{kind:'goomba',x:300,y:208,direction:-1,spawnCamera:124}],spawn:[40,208],checkpoint,evidence:'test'}]};
 const sim=new Simulation([data]);sim.reset(true);let frames=0;
 while(sim.phase==='play'&&frames++<200)sim.step(['right','b'],1);assert.equal(sim.phase,'pipe');
 while(sim.phase==='pipe'&&frames++<400)sim.step([],1);assert.equal(sim.area.id,'interior');dieByControls(sim);assert.equal(sim.checkpoint,true);respawn(sim);
 assert.equal(sim.area.id,'interior');assert.equal(sim.player.x,120);assert.equal(sim.camera,80);assert.equal(sim.lives,2);
});

test('death before an interior checkpoint respawns inside while a fresh start uses the outside entry',()=>{
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const data:Level={id:'interior-default-respawn-fixture',time:400,main:'outside',respawnArea:'interior',evidence:'Ordinary pipe/collision fixture for the observed1-2/2-2 interior default respawn',areas:[{id:'outside',width:512,palette:0,theme:'ground',tiles,enemies:[],spawn:[40,208],pipes:[{x:160,y:208,direction:'right',to:'interior',spawn:[40,208],camera:0,transitionFrames:64}],evidence:'test'},{id:'interior',width:512,palette:3,theme:'underground',tiles,enemies:[{kind:'goomba',x:160,y:208,direction:-1,spawnCamera:0}],spawn:[40,208],checkpoint:{activationX:400,spawn:[360,208],camera:320,activationStatus:'inferred',activationBracket:[390,410],evidence:'Fixture gate remains beyond the genuine collision'},evidence:'test'}]};
 const sim=new Simulation([data]);sim.reset(true);assert.equal(sim.area.id,'outside');let frames=0;
 while(sim.phase==='play'&&frames++<200)sim.step(['right','b'],1);assert.equal(sim.phase,'pipe');
 while(sim.phase==='pipe'&&frames++<400)sim.step([],1);assert.equal(sim.area.id,'interior');dieByControls(sim);assert.equal(sim.checkpoint,false);respawn(sim);
 assert.equal(sim.area.id,'interior');assert.equal(sim.player.x,40);assert.equal(sim.camera,0);assert.equal(sim.lives,2);
 sim.reset(true);assert.equal(sim.area.id,'outside');
});

test('compiled automatic outdoor entries use their active play area for default death respawn',()=>{
 for(const id of ['1-2','2-2','4-2','7-2']){const level=levels.find(l=>l.id===id)!;assert.notEqual(level.respawnArea,level.main,id);assert.equal(!!level.areas.find(a=>a.id===level.respawnArea)?.autoWalk,false,id);}
});

test('interior checkpoint deaths bypass the measured entrance fall and accept ordinary movement',()=>{
 for(const id of ['1-2','2-2','7-2']){
  const source=levels.find(l=>l.id===id)!,base=source.areas.find(a=>a.id===source.respawnArea)!,checkpoint=base.checkpoint!,width=checkpoint.activationX+512,water=base.theme==='water';
  const data:Level={id:id+'-interior-collision-fixture',time:400,main:base.id,evidence:'Isolated ordinary collision floor using actual compiled entry/checkpoint data; no campaign-map or win claim',areas:[{id:base.id,width,palette:base.palette,theme:base.theme,spawn:structuredClone(base.spawn),spawnVelocity:base.spawnVelocity,camera:base.camera,entryFall:base.entryFall,waterEntryFall:base.waterEntryFall,checkpoint:structuredClone(checkpoint),tiles:Array.from({length:Math.ceil(width/16)},(_,x)=>[x,13,84]),enemies:[{kind:water?'blooper':'goomba',x:checkpoint.activationX+80,y:water?180:208,direction:-1,spawnCamera:checkpoint.activationX-112}],evidence:'Synthetic controller fixture with measured entry and checkpoint profiles'}]};
  const sim=new Simulation([data]);sim.reset(true);dieByControls(sim,['right'],2500);assert.equal(sim.checkpoint,true,id);respawn(sim);
  assert.equal(sim.area.id,base.id,id);assert.equal(sim.player.x,checkpoint.spawn[0],id);assert.equal(sim.player.y,208,id);assert.equal(sim.camera,checkpoint.camera,id);assert.equal(sim.entryFallHidden,false,id);assert.equal(sim.entryTimerHidden,false,id);
  sim.step(['right'],5);assert.ok(sim.player.x>checkpoint.spawn[0],id+' must respond without entrance input delay');assert.equal(sim.player.dead,false,id);
 }
});

for(const[prefix,eligible]of [[76,false],[77,true]] as const)test(`actual1-1 terrain and recorded prefix${prefix} reproduce the observed checkpoint eligibility`,()=>{
 const sim=new Simulation(levels);sim.reset(true);recordedPrefix(sim,prefix);dieByControls(sim,[],30000);assert.equal(sim.checkpoint,eligible);respawn(sim);
 assert.equal(sim.player.x,eligible?1320:40);assert.equal(sim.camera,eligible?1280:0);assert.equal(sim.lives,2);
});

test('only checkpoint activation candidates supported by before/after branches are compiled',()=>{
 for(const rule of rules){const level=levels.find(l=>l.id===rule.level)!,area=level.areas.find(a=>a.id===rule.area)!;assert.deepEqual(area.checkpoint,rule);assert.ok(rule.activationX>=rule.activationBracket[0]&&rule.activationX<=rule.activationBracket[1]);}
 for(const level of levels.filter(l=>l.id.endsWith('-4')))for(const area of level.areas)assert.equal(area.checkpoint,undefined);
 assert.equal(levels.find(l=>l.id==='8-1')!.areas[0].checkpoint,undefined);
});

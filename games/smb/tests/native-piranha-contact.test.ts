import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Contact rectangles correlated against controlled native save/load approaches, not extracted game tables.
const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/native-piranha-contact.json',import.meta.url),'utf8'));
for(const c of cases)test(`Piranha ${c.level} ${c.branch} native row${c.frame}: ${c.touch?'hurt':'safe'} contact rectangles`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.player.y=c.marioY+32;sim.player.size=0;
 const player=c.playerBox,plant=c.plantBox;
 assert.equal(plant[1],c.plantPriorY+14,'plant top follows its position before moving');
 assert.equal(plant[3],c.plantPriorY+20,'plant contact height is six pixels');
 assert.equal(player[3]-player[1],12,'small Mario contact height');
 const rectanglesTouch=player[0]<=plant[2]&&player[2]>=plant[0]&&player[1]<=plant[3]&&player[3]>=plant[1];
 assert.equal(rectanglesTouch,c.touch,'native rectangles agree with the observed outcome');
 sim.piranhaTouchFeetY=player[3];
 assert.equal(sim.nativeTouch({kind:'piranha'},c.plantPriorY+24,true),c.touch);
 if(c.hurtTimer!==undefined){assert.equal(c.hurtTimer,0);assert.equal(c.starTimer,0);assert.equal(c.size,0);}
 if(c.level==='5-1')assert.equal(player[3],sim.player.y+1,'the contact box precedes the landing snap');
});

test('movePlayerY keeps the Piranha contact feet from before the floor snap',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-1')!);
 const sim:any=new Simulation([level]);sim.reset(true);sim.player.x=825+160/256;sim.player.y=125+240/256+32;sim.player.vy=3+144/256;sim.player.grounded=false;
 sim.movePlayerY(sim.player.vy,16,false,144/256);
 assert.equal(sim.player.y,160);assert.equal(sim.piranhaTouchFeetY,161.5);
 assert.equal(sim.nativeTouch({kind:'piranha'},147+24,true),true,'a true native landing contact remains dangerous');
});

test('the exact 3-1 approach survives the retracting plant for the full native branch',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('./fixtures/native-piranha-approach.json',import.meta.url),'utf8')),a=c.seed;
 const level=structuredClone(observedLevels().find(l=>l.id==='3-1')!);
 const sim:any=new Simulation([level]);sim.reset(true);sim.loadArea('main',[a.x+a.subx/256,a.y+32+a.suby/256],a.x-112);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;
 const plant=sim.enemies.find((e:any)=>e.kind==='piranha'&&e.x===1656);sim.enemies=[plant];plant.active=true;plant.y=a.plantY;plant.phase=0;plant.age=2*(plant.y-(plant.originY-24));delete plant.slotBorn;
 const p=sim.player;Object.assign(p,{vx:a.vx/4096,vy:a.vy+a.vyFrac/256,grounded:false,facing:1});sim.motor.reset(a.vx,1);sim.motor.moving=1;sim.motor.airRun=false;sim.fallGravity=a.fallForce/256;sim.runJump=false;sim.mediumJump=false;sim.jumpArc=true;sim.landJump='held';
 const keys=['up','down','left','right','a','b','start','select'],buttons=(pad:number)=>keys.filter((_,j)=>pad&(1<<j));sim.inputs=[new Set(buttons(c.rows[0].pad)),new Set(buttons(c.rows[1].pad))];
 for(let i=0;i<c.rows.length;i++){
  sim.step(buttons(c.rows[Math.min(i+2,c.rows.length-1)].pad),1);
  assert.equal(sim.phase,'play',`safe native row${c.frame+i+1}`);
  if(i<15){const n=c.rows[i];assert.equal(p.x,n.x+n.subx/256,`exact x before contact row${c.frame+i+1}`);assert.equal(p.y+(p.grounded?sim.landingFraction:0),n.y+32+n.suby/256,`exact y before contact row${c.frame+i+1}`);}
 }
});

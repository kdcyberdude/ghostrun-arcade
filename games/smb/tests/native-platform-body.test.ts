import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native rows with the platform slot of the same frame. A width other than 48 and range 0 make a static fixture platform with its collision top at y 80 or 112.
function rising(levelId:string,x:number,feet:number,vy:number,top:number){
 const level=structuredClone(observedLevels().find(l=>l.id===levelId)!),s:any=new Simulation([level]);s.reset(true);s.loadArea('main',[x,feet],x-112);s.phase='play';s.phaseFrame=0;s.area.enemies=[];s.enemies=[];
 s.area.platforms=[{x:x-7,y:top+1,width:32,axis:'x',range:0,speed:0}];
 const held=['right','a','b'];s.inputs=[new Set(held),new Set(held)];
 Object.assign(s.player,{vx:10432/4096,vy,grounded:false,facing:1});s.motor.speed=10432;s.motor.airRun=true;s.motor.moving=1;s.motor.facing=1;s.runJump=true;s.jumpArc=true;s.landJump='held';
 return {s,step(){s.step(held,1);s.player.x=x;s.camera=x-112;return {y:Math.floor(s.player.y)-32,vy:Math.floor(s.player.vy)};}};
}

test('a rising Mario stops under a platform as under a ceiling (3-3 route rows 25945-25958)',()=>{
 const {step}=rising('3-3',1509,112,-3.75,80),native=[76,72,74,76,78,81,85,89,93,97,101,105,109];
 native.forEach((y,i)=>{const r=step();assert.ok(Math.abs(r.y-y)<=1,`row ${i}: ${r.y} vs native ${y}`);if(i===1)assert.equal(r.vy,1);});
});

test('feet 29 px below the platform top is not yet a hit, 27 px is (6-3 model rows 955-956)',()=>{
 const {step}=rising('6-3',770,141,-2.5,112);
 const before=step();assert.equal(before.y,106);assert.ok(before.vy<0,'still rising after the row from 29 px');
 const hit=step();assert.equal(hit.vy,1);
});

test('the 6-4 ledge at y 112 reaches x 1152: native stands through x 1148 and is falling by x 1160 (probe from route row 54470)',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='6-4')!),s:any=new Simulation([level]);s.reset(true);s.loadArea('main',[1133,144],1021);s.phase='play';s.phaseFrame=0;s.area.enemies=[];s.enemies=[];
 const held=['right','b'];s.inputs=[new Set(held),new Set(held)];
 Object.assign(s.player,{vx:10492/4096,vy:0,grounded:true,facing:1});s.motor.speed=10492;s.motor.airRun=true;s.motor.moving=1;s.motor.facing=1;
 while(s.player.x<1160){s.step(held,1);if(s.player.x<=1148)assert.equal(s.player.y,144,`x ${s.player.x}`);}
 for(let i=0;i<3;i++)s.step(held,1);
 assert.ok(s.player.y>144,'off the ledge');
});

import {test} from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
import {nativePlatformObject} from '../src/platform-motion.js';

for(const kind of ['lift','horizontal'] as const)test(`DonePlayerTask completion runs native ${kind} platform landing/carry without another player turn`,()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-3')!),sim:any=new Simulation([level]);sim.reset(true);
 const platform=sim.area.platforms.find((p:any)=>nativePlatformObject(p,sim.platformMotion.context)?.kind===kind)!,object=nativePlatformObject(platform,sim.platformMotion.context)!;
 sim.area.platforms=[platform];sim.area.generators=[];sim.area.firebars=[];sim.enemies=[];sim.items=[];
 sim.camera=object.x-112;sim.platformMotion.reset();sim.platformMotion.create(platform,0);sim.platformMotion.advance(0,sim.camera,0);sim.platformSlots=new Map([[platform,0]]);
 let age=1,previous=sim.platformMotion.collisionPosition(platform,age),next=sim.platformMotion.collisionPosition(platform,age+1);
 while(age<512&&Math.floor(previous[kind==='lift'?'y':'x'])===Math.floor(next[kind==='lift'?'y':'x'])){age++;previous=next;next=sim.platformMotion.collisionPosition(platform,age+1);}
 assert.ok(age<512,'source motor must reach a whole-pixel move');
 sim.platformFrame=age;sim.platformMotion.advance(age,sim.camera,age&255);sim.random.frame=(age+1)&255;
 Object.assign(sim.player,{x:previous.x+4,y:previous.y,vx:0,vy:1,grounded:false,climbing:false,size:1});
 const x=sim.player.x;sim.intervalControl=7;sim.powerChange=undefined;
 sim.resumeWorldAfterTransform();
 assert.equal(sim.player.x,x+Math.floor(next.x)-Math.floor(previous.x),'only the platform integer carry moves X');
 assert.equal(sim.player.y,next.y,'source platform collision positions Mario on the moving surface');
 assert.equal(sim.platformScroll,Math.floor(next.x)-Math.floor(previous.x),'native carry is retained for the next scroll pass');
 assert.equal(sim.player.vy,0);assert.equal(sim.player.grounded,true);assert.equal(sim.intervalControl,7,'NMI interval remains held on completion');
});

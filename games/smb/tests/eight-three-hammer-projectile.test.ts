import {isolatePlacedStream} from './helpers/isolated-placed-stream.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function throwingBro(levelId:string,playerX=40){
 const level=structuredClone(observedLevels().find(l=>l.id==='8-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 const bro=area.enemies.find(e=>e.kind==='hammerBro')!;
 level.id=levelId;area.enemies=[{...bro,x:200,y:208}];area.cannons=[];area.generators=[];
 const sim=isolatePlacedStream(new Simulation([level]));sim.reset(true);sim.loadArea('main',[playerX,208],0);
 const owner=sim.enemies[0];owner.active=true;owner.enemySlot=0;owner.hbro={state:0,jumpTimer:200,throwTimer:0,frameTimer:0,interval:128,speed:0,force:0,fraction:0,y:184};
 sim.step([],1);
 const hammer=sim.items.find(i=>i.kind==='hammer');assert.ok(hammer);sim.step([],14);assert.equal(hammer.nativeHammer?.state,0x81);
 return {sim,hammer};
}

test('an 8-3 Hammer Bro projectile travels 30 pixels in 30 frames',()=>{
 const {sim,hammer}=throwingBro('8-3');const x=hammer.x;
 sim.step([],30);
 assert.equal(hammer.x-x,-30);
});

test('an 8-3 Hammer Bro can throw right at the same measured speed',()=>{
 const {hammer}=throwingBro('8-3',300);
 assert.equal(hammer.vx,1);
});

test('Hammer Bro projectile speed is one pixel in earlier worlds too',()=>{
 const {hammer}=throwingBro('1-1');
 assert.equal(hammer.vx,-1);
});

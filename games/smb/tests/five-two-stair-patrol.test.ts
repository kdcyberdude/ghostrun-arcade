import {test} from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';

test('5-2 first Hammer Bro can patrol left off the observed stair',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!),area=level.areas.find(a=>a.id==='area-2')!;
 area.enemies=area.enemies.filter(e=>e.kind==='hammerBro'&&e.x===752);area.generators=[];
 const s=new Simulation([level]);s.reset(true);s.loadArea('area-2',[460,208],449);
 const bro=s.enemies.find(e=>e.kind==='hammerBro')!;
 // Source tick5432: x743 / feet144. Direction and subpixel are fixture assumptions.
 bro.active=true;bro.x=743.5;bro.y=144;bro.vx=-.25;bro.vy=0;bro.enemySlot=0;bro.hbro={state:0,jumpTimer:200,throwTimer:200,frameTimer:0,interval:128,speed:0,force:0,fraction:0,y:120};s.random.frame=63;
 s.step([],22);assert.equal(s.phase,'play');assert.ok(Math.abs(bro.x-737)<=2);assert.ok(Math.abs(bro.y-160)<=2);
});

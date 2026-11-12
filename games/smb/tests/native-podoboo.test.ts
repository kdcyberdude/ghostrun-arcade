import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import water from '../data/native-water-actors.json';
import type {Area,EnemySpec,Level,Tile} from '../src/types.js';

// Native lava Podoboo of 5-4 (v2 trace, slot 1, x 320; RAM y page 0xB7/y 0xD0, speed 0xA1, move force 0x435, fraction 0x418, EnemyIntervalTimer 0x797, IntervalTimerControl 0x77F):
// row 57 rests at y 514 (page 2, below the screen) with timer 1 and IntervalTimerControl 0; row 58 the control wraps, the timer reaches 0 and it relaunches with
// random byte s+1 = 86 (force 214, timer 6, speed -7). Native y every 4th row from 58.
const NATIVE_5_4_SLOT1_Y=[508,484,462,442,424,407,393,379,368,359,351,345,340,338,337,338,341,345,351,359];

function fixture(enemy:Partial<EnemySpec>){
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,13,84]);
 const area:Area={id:'main',width:1024,palette:6,theme:'castle',tiles,enemies:[{kind:'podoboo',x:256,y:282,palette:'0f-16-30-27',direction:-1,...enemy}],spawn:[40,208],evidence:'Synthetic castle fixture'};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim;
}

test('a Podoboo relaunches when its interval timer runs out, from the random byte of its slot, and follows MoveJ_EnemyVertically (5-4 rows 57-134)',()=>{
 const sim=fixture({launch:{delay:2,v0:6.18}}) as any,podoboo=sim.enemies[0];
 Object.assign(podoboo,{active:true,enemySlot:1,pod:{y:514,speed:0,force:84,fraction:84,timer:1}});sim.intervalControl=0;
 const ys:number[]=[];
 for(let row=58;row<=134;row++){
  sim.tickIntervalTimers();
  if(row===58){sim.random.bytes=[0,0,86,0,0,0,0];assert.equal(podoboo.pod.timer,0,'the control wraps: timer 1 -> 0');}
  sim.updateNativePodoboo(podoboo);
  if(row===58){assert.equal(podoboo.pod.timer,6);assert.equal(podoboo.pod.speed,-7);assert.equal(podoboo.pod.force,(86|0x80)+28);}
  if((row-58)%4===0)ys.push(podoboo.pod.y);
 }
 assert.deepEqual(ys,NATIVE_5_4_SLOT1_Y);
 assert.equal(podoboo.y,359-256+24,'remake feet = native y + 24 on the visible page');
});

test('the compiled castle levels carry the native Podoboo populations',()=>{
 const counts:Record<string,number>={'2-4':2,'3-4':6,'4-4':1,'5-4':6,'6-4':3,'7-4':2,'8-4':1};
 for(const entry of water.areas.filter(a=>a.replaceKinds.includes('podoboo'))){
  const area=observedLevels().find(l=>l.id===entry.level)!.areas.find(a=>a.id===entry.area)!;
  const podoboos=area.enemies.filter(e=>e.kind==='podoboo');
  assert.equal(podoboos.length,counts[entry.level]);
  assert.ok(podoboos.every(p=>p.launch!==undefined&&p.y===282));
 }
 const four=observedLevels().find(l=>l.id==='4-4')!.areas[0].enemies.filter(e=>e.kind==='podoboo');
 assert.deepEqual(four.map(p=>p.x),[2640]); // the screenshot placement was at x 2608
});

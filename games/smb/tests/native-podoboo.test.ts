import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import water from '../data/native-water-actors.json';
import type {Area,EnemySpec,Level,Tile} from '../src/types.js';

// Native lava Podoboo of 5-4 (read-only trace of the recorded route, slot 0 from row 44586, x 256): [frames since it appeared, native y].
// It appears at y 258 (the byte reads 2), is launched at frame 2 and falls back to the bottom around frame 128, where it is launched again.
const NATIVE_5_4_ROW_44586:[number,number][]=[[8,217],[16,176],[24,143],[32,117],[40,97],[48,85],[56,80],[64,81],[72,90],[80,106],[88,128],[96,154],[104,180],[112,206],[120,232]];

function fixture(enemy:Partial<EnemySpec>){
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,13,84]);
 const area:Area={id:'main',width:1024,palette:6,theme:'castle',tiles,enemies:[{kind:'podoboo',x:256,y:282,palette:'0f-16-30-27',direction:-1,...enemy}],spawn:[40,208],evidence:'Synthetic castle fixture'};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim;
}

test('a measured Podoboo follows the native first jump (launch frame, speed, gravity 28/256) and is launched again at the bottom',()=>{
 const sim=fixture({launch:{delay:2,v0:6.18}});
 sim.step([],1);const podoboo=sim.enemies[0];assert.equal(podoboo.y,282); // frame 0: native y 258 + 24
 let k=0;
 for(const [at,y] of NATIVE_5_4_ROW_44586){
  sim.step([],at-k);k=at;
  assert.ok(Math.abs(podoboo.y-24-y)<=2,`k ${at}: y ${podoboo.y-24} vs ${y}`);
 }
 assert.ok(!podoboo.dead&&podoboo.x===256);
 sim.step([],16); // native: bottom (y 254) at frame 129, launched again, y 204 at frame 136
 assert.ok(podoboo.vy<0||podoboo.y-24<254,`relaunched: vy ${podoboo.vy} y ${podoboo.y-24}`);
 sim.step([],60);assert.ok(podoboo.y-24<120);
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

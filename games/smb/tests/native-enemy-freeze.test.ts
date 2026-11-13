import {test} from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {GameRenderer} from '../src/renderer.js';import {enemyPictureTimersStopped} from '../src/enemy-picture.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import type {Button,Enemy} from '../src/types.js';
import replay from './fixtures/native-palette-entry.json';import data from './fixtures/native-enemy-freeze.json';
test('native TimerControl freezes drawn Goomba cells through every arc-death row',()=>{
 assert.ok(data.rows.length>200);const s=new Simulation(observedLevels());s.reset(true);initializeEntrance(s,replay.entrance);s.step([],0);(s as any).inputs=[];
 const renderer=Object.create(GameRenderer.prototype) as any,rows=new Map(data.rows.map(r=>[r.frame,r])),names:Button[]=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<=data.rows.at(-1)!.frame;f++){
  s.step(names.filter((_,b)=>replay.pads[f]&(1<<b)),1);const row=rows.get(f);if(!row)continue;
  assert.equal(s.nativeTimersStopped,row.timer!==0,`native TimerControl row ${f}`);
  const e=s.enemies.find(e=>e.active&&!e.dead&&!e.slotFreed&&e.enemySlot===row.slot);assert.ok(e);const pieces:{id:number;x:number;y:number;flip:boolean}[]=[];renderer.spriteTile=(id:number,x:number,y:number,_palette:string,flip:boolean)=>pieces.push({id,x,y,flip});renderer.enemy(e,s);const order=(a:{x:number;y:number},b:{x:number;y:number})=>a.y-b.y||a.x-b.x;assert.deepEqual(pieces.sort(order),[...row.sprites].sort(order),`native Goomba OAM row ${f}`);
 }
});
test('enemy graphics keep the TimerControl read before contact on its own handler row',()=>{
 const e={graphicsFrame:10,graphicsTimersStopped:false} as Enemy;
 assert.equal(enemyPictureTimersStopped(e,10,true),false);assert.equal(enemyPictureTimersStopped(e,11,true),true);assert.equal(enemyPictureTimersStopped(e,11,false),false);
});

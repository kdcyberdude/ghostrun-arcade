import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('ordinary used-block re-hit keeps its collision and bump sound while marking only the re-hit',()=>{
 const s=new Simulation(observedLevels());s.reset(true);
 const events:{frame:number;events:string[];marker:boolean;vy:number;score:number;coins:number}[]=[];
 // The leftward walk is 54 frames: the native-speed motor carries Mario to x=271 after 46 frames, past the used block's
 // head probe; 52..56 frames place him under it (route verified against native x, evidence/world11-motor-rewrite-findings-20261109.md).
 for(const [buttons,n] of [[['right','b'],98],[['right','a','b'],6],[['right','b'],4],[['left'],54],[[],32],[['a'],20],[[],20]] as const){
  for(let i=0;i<n;i++){s.step([...buttons],1);if(s.events.length)events.push({frame:s.frame,events:[...s.events],marker:s.usedBlockRehits.has('16,9'),vy:s.player.vy,score:s.score,coins:s.coins});s.events.splice(0);}
 }
 const first=events.find(e=>e.events.includes('sfx_coin'));assert.ok(first);assert.equal(first.marker,false);assert.equal(first.score,200);assert.equal(first.coins,1);
 const second=events.find(e=>e.events.includes('sfx_bump'));assert.ok(second);assert.equal(second.marker,true);assert.ok(second.vy>0);assert.equal(second.score,200);assert.equal(second.coins,1);assert.equal(s.usedBlockRehits.has('16,9'),false);
});

test('used-block re-hit retains the existing enemy-bump interaction',()=>{
 const s=new Simulation(observedLevels());s.reset(true);
 // Unit fixture: place an existing active enemy over an already-used block.
 const enemy=s.enemies[0];assert.ok(enemy);enemy.x=16*16;enemy.y=9*16;enemy.active=true;enemy.dead=0;s.tiles.set('16,9',196);s.events.splice(0);
 Reflect.get(s,'hitBlock').call(s,16,9,196);
 assert.equal(s.bump.get('16,9'),0);assert.equal(s.usedBlockRehits.has('16,9'),true);assert.equal(enemy.dead,1);assert.equal(enemy.vy,-3);assert.equal(s.score,100);assert.ok(s.events.includes('sfx_bump'));
});

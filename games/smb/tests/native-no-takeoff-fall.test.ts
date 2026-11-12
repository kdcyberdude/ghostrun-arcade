import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native route rows 6880..6929 (1-4 start, Right+B, no jump yet), also identical at 2-4 f19002, 3-4 f27133, 5-4 f44596, 6-4 f53966, 7-4 f63675: two stair walk-offs at 40/256 gravity.
const NATIVE_Y=[80,80,80,80,80,80,80,80,80,81,82,83,84,85,87,88,90,92,94,96,98,101,103,106,109,112,112,112,112,112,112,112,112,113,113,114,115,116,117,118,119,121,123,125,127,128,128,128,128,128];

function castleStart(){
 const levels=observedLevels(),sim:any=new Simulation(levels);sim.reset(true);sim.levelIndex=levels.findIndex(l=>l.id==='1-4');sim.loadArea(sim.level.main);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;sim.enemies.length=0;
 const p=sim.player;p.x=42.375;p.y=112;p.vy=0;p.vx=2128/4096;p.grounded=true;sim.motor.reset();sim.motor.speed=2128;sim.inputs=[new Set(['right','b']),new Set(['right','b'])];
 return sim;
}

test('a walk-off before the first takeoff of a level follows the native rows of the castle start stairs',()=>{
 const sim=castleStart(),ys:number[]=[];
 for(let i=0;i<NATIVE_Y.length;i++){sim.step(['right','b'],1);ys.push(Math.floor(sim.player.y)-32);}
 // First stair exact. The second walk-off starts from native's unknown landing sub-pixel, so it may differ by 1 px.
 assert.deepEqual(ys.slice(0,32),NATIVE_Y.slice(0,32));
 ys.forEach((y,i)=>assert.ok(Math.abs(y-NATIVE_Y[i])<=1,`row ${i}: ${y} vs native ${NATIVE_Y[i]}`));
});

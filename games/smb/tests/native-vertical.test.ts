import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native jump arcs of the retained model-play PPU traces (evidence/local/model-play/it000910/mood0, takeoff rows 1452, 5952, 1528), teacher-forced from the takeoff row in an open 1-1 column
// (tools/harness/model-vertical-score.ts does the same over 3,385 jumps: 99.0% exact). Rows are [pad byte, vy byte, y relative to the last ground row]; the speed is the native speed
// (1/256 px) on the last ground row. The sim's two-frame input queue needs the controller frames one row early here (early=1, as the tool measures).
type Row=[number,number,number];
const keys=['up','down','left','right','a','b'] as const;
const names=(m:number)=>keys.filter((_,b)=>m&(1<<b));
const X0=3136,FEET=208;
function replay(vx:number,rows:Row[],lead:number){
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.loadArea(sim.level.main);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;sim.enemies.length=0;
 const p=sim.player;p.x=X0;p.y=FEET;p.vy=0;p.grounded=true;p.vx=vx/4096;sim.camera=X0-112;sim.motor.reset();sim.motor.speed=vx;sim.motor.airRun=Math.abs(Math.floor(vx/256))>=25;
 sim.runJump=false;sim.mediumJump=false;sim.landJump='inactive';
 const pad=(i:number)=>names(i<0?lead:(rows[i]??rows[rows.length-1])[0]);
 sim.inputs=[new Set(pad(0)),new Set(pad(1))];
 const out:{vy:number,dy:number}[]=[];
 for(let i=0;i<rows.length;i++){sim.step(pad(i+2),1);p.x=X0;sim.camera=X0-112;out.push({vy:Math.floor(p.vy),dy:Math.floor(p.y)-FEET});}
 return out;
}
const check=(vx:number,rows:Row[],lead:number)=>{const out=replay(vx,rows,lead);rows.forEach(([,vy,dy],i)=>assert.deepEqual(out[i],{vy,dy},`row ${i}: ${JSON.stringify(out[i])} vs native ${vy}/${dy}`));};

test('slow jump: held A rise at 0.125, release at 0.4375, fall reaches the 4.0 cap with 4/5 px steps',()=>{
 check(1024,[[57,-4,-4],[57,-4,-8],[57,-4,-12],[57,-4,-16],[57,-4,-19],[57,-4,-23],[57,-4,-26],[57,-3,-29],[57,-3,-32],[57,-3,-35],[57,-3,-38],[57,-3,-40],[57,-3,-43],[57,-3,-45],[57,-3,-47],[57,-2,-49],[41,-2,-51],[41,-2,-53],[41,-1,-54],[41,-1,-55],[41,0,-55],[41,0,-55],[41,1,-54],[41,1,-53],[41,1,-52],[41,2,-50],[41,2,-47],[41,3,-45],[41,3,-41],[41,4,-38],[41,4,-34],[41,4,-30]],1);
});

test('run jump (speed byte 40): v0 -5, held gravity 0.15625, released 0.5625, steady 4 px fall',()=>{
 check(10248,[[56,-5,-5],[56,-5,-10],[56,-5,-15],[56,-5,-20],[56,-5,-24],[56,-5,-28],[56,-4,-32],[56,-4,-36],[56,-4,-40],[56,-4,-43],[56,-4,-47],[56,-4,-50],[56,-3,-53],[56,-3,-56],[56,-3,-59],[56,-3,-62],[50,-3,-64],[50,-3,-67],[50,-3,-69],[50,-2,-71],[41,-2,-73],[41,-1,-74],[41,-1,-75],[41,0,-75],[41,0,-75],[41,1,-74],[41,2,-72],[41,2,-70],[41,3,-67],[41,3,-64],[41,4,-60],[41,4,-56],[41,4,-52],[41,4,-48],[41,4,-44],[41,4,-40],[40,4,-36],[40,4,-32],[40,4,-28],[40,4,-24]],1);
});

test('speed byte 24 (1.5 px/frame) is the medium class: v0 -4, held gravity 0.1171875 (eight rows of vy -4)',()=>{
 check(6244,[[57,-4,-4],[57,-4,-8],[57,-4,-12],[57,-4,-16],[57,-4,-19],[57,-4,-23],[57,-4,-26],[57,-4,-29],[57,-3,-32],[57,-3,-35],[57,-3,-38],[57,-3,-41],[57,-3,-43],[57,-3,-46]],1);
});

import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import controls from '../evidence/horizontal-control-cases.json';
import type {Button} from '../src/types.js';

export const horizontalCases=controls.cases.map(c=>c.name);
export function compareHorizontalCase(name:string){
 const sample=controls.cases.find(c=>c.name===name);if(!sample)throw Error(`Unknown comparison ${name}`);
 const sim=new Simulation(observedLevels());sim.reset(true);
 const keys:Button[]=['up','down','left','right','a','b'];
 const rows=sample.actions.map(action=>{
  sim.step(keys.filter((_,bit)=>Boolean(action.mask&(1<<bit))),action.frames);
  const dx=Math.floor(sim.player.x)-action.x,dy=Math.floor(sim.player.y)-action.y,cameraError=sim.camera-action.camera;
  return {frame:sim.frame,reference:[action.x,action.y,action.camera],remake:[Math.floor(sim.player.x),Math.floor(sim.player.y),sim.camera],dx,dy,cameraError,referenceImage:action.image,pass:Math.max(Math.abs(dx),Math.abs(dy),Math.abs(cameraError))<=2};
 });
 return {name,samples:rows.length,maxError:Math.max(...rows.map(r=>Math.max(Math.abs(r.dx),Math.abs(r.dy),Math.abs(r.cameraError)))),pass:rows.every(r=>r.pass),rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const cases=horizontalCases.map(compareHorizontalCase);
 fs.writeFileSync('evidence/horizontal-comparison.json',JSON.stringify({date:new Date().toISOString(),tolerancePixels:2,method:'Fresh production reset per independent captured reference control experiment. Actual applied masks/native durations; no state writes or skips. World X and feet/camera compared separately.',cases},null,2)+'\n');
 console.log(cases.map(({name,samples,maxError,pass})=>({name,samples,maxError,pass})));
 if(cases.some(c=>!c.pass))process.exitCode=1;
}

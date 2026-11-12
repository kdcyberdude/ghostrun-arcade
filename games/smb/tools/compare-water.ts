import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {Simulation} from '../src/simulation.js';
import type {Button,Level,Tile} from '../src/types.js';

interface WaterRecord {
 experiment:string;experimentNativeFrames:number;localImage:string;
 request:{op:string;buttons?:Button[]};response:{frames_advanced:number;applied_masks:number[]};
 position?:{worldOriginX:number;visibleBottom:number;method?:string}|null;
}
const source=JSON.parse(readFileSync(new URL('../data/water-physics.json',import.meta.url),'utf8')) as {records:WaterRecord[]};
const controllerBits:Button[]=['up','down','left','right','a','b'];
export const waterCases=['water-walk','water-run','water-reverse','water-short-a','water-held-a','water-air-walk','water-air-run','water-repeated-a','water-surface','water-surface-pulses'];

export function waterFixture():Level {
 const tiles:Tile[]=[];
 for(let x=0;x<80;x++)tiles.push([x,13,84],[x,14,84]);
 return {id:'water-measurement-fixture',main:'water',time:400,evidence:'Synthetic flat floor reproducing the measured settled World 2-2 starting condition. This is not a campaign run.',areas:[{id:'water',width:1280,palette:0,theme:'water',tiles,enemies:[],spawn:[40,208],evidence:'Measured water floor and settled small player; enemies and later geometry excluded.'}]};
}

export function compareWaterCase(name:string){
 const sim=new Simulation([waterFixture()]);sim.reset(true);
 const rows=[];
 // The 180-frame neutral prefix settles at (40,208); its unmeasured entry velocity
 // is deliberately excluded. No runtime player state is changed after this reset.
 for(const record of source.records.filter(r=>r.experiment===name&&r.request.op==='step'&&r.experimentNativeFrames>180)){
  if(record.response.applied_masks.length!==1)throw new Error('Expected one measured controller decision per water record');
  const mask=record.response.applied_masks[0];
  const buttons=controllerBits.filter((_,bit)=>Boolean(mask&(1<<bit)));
  sim.step(buttons,record.response.frames_advanced);
  if(!record.position)continue;
  const x=Math.floor(sim.player.x),y=Math.floor(sim.player.y);
  rows.push({frame:record.experimentNativeFrames-180,framesAdvanced:record.response.frames_advanced,appliedMask:mask,reference:[record.position.worldOriginX,record.position.visibleBottom],remake:[x,y],dx:x-record.position.worldOriginX,dy:y-record.position.visibleBottom,positionMethod:record.position.method??'exact supplied opaque sprite template',referenceImage:record.localImage});
 }
 return {name,frames:sim.frame,samples:rows.length,maxXError:Math.max(...rows.map(r=>Math.abs(r.dx))),maxYError:Math.max(...rows.map(r=>Math.abs(r.dy))),firstDivergence:rows.find(r=>Math.abs(r.dx)>2||Math.abs(r.dy)>2)??null,pass:rows.every(r=>Math.abs(r.dx)<=2&&Math.abs(r.dy)<=2),rows};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const cases=waterCases.map(compareWaterCase);
 const report={measuredAt:new Date().toISOString(),tolerancePixels:2,method:'Captured applied controller masks and actual native frame counts replayed through the production Simulation on an explicit flat-water fixture, starting from the screenshot-observed settled condition (40,208). This tests small-player movement, not water-room entry, renderer equivalence or complete campaign play.',unresolved:['The 15-frame repeated-stroke trace still differs by3px at native frame158. The unchanged2px threshold therefore fails.','The geometric surface-force rule and subpixel stroke reset are inferred; see data/water-physics-rules.json for the frozen fit and independent reserved results.','The initial water-entry velocity is not measured.','Big/fire-player swimming, underwater combat, currents and water exits remain unmeasured.','Seven/eight-frame image intervals cannot establish a two-native-frame apex timing pass.'],cases};
 writeFileSync(new URL('../evidence/water-comparison.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(cases.map(({name,samples,maxXError,maxYError,pass})=>({name,samples,maxXError,maxYError,pass})),null,2));
 if(cases.some(c=>!c.pass))process.exitCode=1;
}

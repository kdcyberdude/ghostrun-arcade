import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {Simulation} from '../src/simulation.js';
import type {Button} from '../src/types.js';
import {compareWaterCase,waterCases,waterFixture} from './compare-water.js';

const root=new URL('../',import.meta.url);
const load=(path:string)=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const fresh=load('data/water-fresh-measurements.json'),reserved=load('data/water-reserved-evaluation.json'),floor=load('data/water-floor-restroke-measurements.json');
interface MeasuredCase {id:string;steps:{buttons:Button[];nativeFrames:number;elapsedNativeFrames:number;mask:number;tick:number;position:{x:number;y:number;confidence?:number;method?:string}|null;image:string;imageSHA256?:string}[]}
export function compareWaterMeasuredCase(id:string){
 const test=[...fresh.cases,...reserved.cases,...floor.cases].find((c:MeasuredCase)=>c.id===id) as MeasuredCase;
 if(!test)throw new Error(`Unknown measured water case: ${id}`);
 const sim=new Simulation([waterFixture()]);sim.reset(true);const rows=[];
 for(const sample of test.steps){
  sim.step(sample.buttons,sample.nativeFrames);
  if(sim.frame!==sample.elapsedNativeFrames)throw new Error(`Native-frame mismatch: ${id}`);
  if(!sample.position)continue;
  const remake=[Math.floor(sim.player.x),Math.floor(sim.player.y)],p=sample.position;
  rows.push({frame:sim.frame,framesAdvanced:sample.nativeFrames,appliedMask:sample.mask,reference:[p.x,p.y],remake,dx:remake[0]-p.x,dy:remake[1]-p.y,referenceTick:sample.tick,positionMethod:p.method,positionConfidence:p.confidence,referenceImage:sample.image,referenceImageSHA256:sample.imageSHA256});
 }
 return{name:id,frames:sim.frame,samples:rows.length,maxXError:Math.max(...rows.map(r=>Math.abs(r.dx))),maxYError:Math.max(...rows.map(r=>Math.abs(r.dy))),firstDivergence:rows.find(r=>Math.abs(r.dx)>2||Math.abs(r.dy)>2)??null,pass:rows.length>0&&rows.every(r=>Math.abs(r.dx)<=2&&Math.abs(r.dy)<=2),rows};
}
export function compareWaterProduction(){
 return[...waterCases.map(compareWaterCase),...[...fresh.cases,...reserved.cases,...floor.cases].map((c:MeasuredCase)=>compareWaterMeasuredCase(c.id))];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const cases=compareWaterProduction();
 const hash=(path:string)=>createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex');
 const report={generatedUTC:new Date().toISOString(),tolerancePixels:2,status:'Measured intermediate improvement; three remaining 3px failures are not an acceptance pass.',sourceHashes:Object.fromEntries(['src/simulation.ts','src/water-physics.ts','data/water-physics-rules.json','data/water-physics.json','data/water-fresh-measurements.json','data/water-reserved-evaluation.json','data/water-floor-restroke-measurements.json'].map(p=>[p,hash(p)])),qualification:'24 explored calibration cases, two formerly reserved cases and two post-freeze floor-restroke checks. Reserved cases were first evaluated once against a frozen candidate, and were not used for subsequent tuning. Production replays are regressions after that evaluation.',cases,pass:cases.every(c=>c.pass)};
 writeFileSync(new URL('../evidence/water-production-comparison.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({cases:cases.map(({name,maxXError,maxYError,firstDivergence,pass})=>({name,maxXError,maxYError,firstDivergence,pass})),pass:report.pass},null,2));
 if(!report.pass)process.exitCode=1;
}

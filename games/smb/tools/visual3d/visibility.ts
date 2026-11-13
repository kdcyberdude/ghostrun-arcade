// Actual GPU depth/alpha contribution candidates from the same native entrance/decisions in2D and3D.
// npx tsx tools/visual3d/visibility.ts --native=DIR --entrances=DIR [--levels=1-4] [--every=120 | --samples=1-4:1979,1-4:2224] --out=FILE
// Every stepped input is rendered to preserve authored pose history. Only requested samples receive the expensive visibility pass.
import {openGame} from './lib.js';
import {observedLevels} from '../../src/levels.js';
import {decodeEntrance} from '../harness/native-entrance.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const arg=(key:string,fallback='')=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)??fallback;
const native=arg('native'),entrances=arg('entrances'),every=Number(arg('every','120')),limit=Number(arg('frames','Infinity')),samples=arg('samples').split(',').filter(Boolean).map(s=>{const [level,n]=s.split(':');return {level,frame:Number(n)};}),only=arg('levels').split(',').filter(Boolean),out=arg('out');
if(!native||!entrances||!out||!Number.isInteger(every)||every<1||!(limit>0)||samples.some(s=>!Number.isInteger(s.frame)||s.frame<1))throw Error('Expected --native=DIR --entrances=DIR --out=FILE and positive frame samples');
const runtimeCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty=execFileSync('git',['status','--porcelain','--','src','data','assets','tools/visual3d','tools/harness'],{encoding:'utf8'}).trim();
const g=await openGame({view:'3d',query:'quality=low&scale=1'}),keys=['a','b','select','start','up','down','left','right'],rows:any[]=[],levels:any[]=[];
let failure=false;
try{
 await g.page.evaluate(async()=>{const m=await import('/tools/visual3d/placement-page.ts');await m.setup();HTMLCanvasElement.prototype.toDataURL=()=>'';});
 for(const level of observedLevels()){
  if(only.length&&!only.includes(level.id)||samples.length&&!samples.some(s=>s.level===level.id))continue;
  const dir=path.join(native,level.id),pads=await readFile(path.join(dir,'pads.bin')),entrance=decodeEntrance(new Uint8Array(await readFile(path.join(dir,'initial.ram'))),JSON.parse(await readFile(path.join(entrances,level.id,'entrance.json'),'utf8'))),end=Math.min(pads.length,limit,samples.length?Math.max(...samples.filter(s=>s.level===level.id).map(s=>s.frame)):Infinity);
  if(samples.some(s=>s.level===level.id&&s.frame>pads.length))throw Error('Sample exceeds native inputs: '+level.id);
  await g.page.evaluate(async entrance=>{const w=window as any,{initializeEntrance}=await import('/tools/harness/native-entrance.mjs'),s=w.marioDebug.simulation;w.mario.reset({playing:true});initializeEntrance(s,entrance);s.step([],0);s.inputs=[];},entrance);
  const selected=samples.length?samples.filter(s=>s.level===level.id).map(s=>s.frame):Array.from({length:Math.floor(end/every)},(_,i)=>(i+1)*every),first=rows.length;
  for(let from=0;from<end;from+=128){
   const batch=await g.page.evaluate(({buttons,from,selected})=>{const w=window as any,s=w.marioDebug.simulation,rows:any[]=[];for(const [i,b]of buttons.entries()){s.step(b,1,[]);s.events.length=0;w.render3d.render(s);const frame=from+i+1;if(selected.includes(frame)){const result=w.placement.visibilityAudit();rows.push({frame,level:s.level.id,area:s.area.id,phase:s.phase,camera:s.camera,...result});if(!result.instrumentationUnchanged)break;}}return rows;},{buttons:[...pads.subarray(from,Math.min(from+128,end))].map(b=>keys.filter((_,i)=>b&(1<<i))),from,selected});
   rows.push(...batch);if(batch.some(r=>!r.instrumentationUnchanged)){failure=true;break;}
  }
  levels.push({level:level.id,inputFrames:pads.length,renderedPrefixFrames:end,instrumentedFrames:rows.length-first,requestedSamples:selected.length});console.log(level.id+': '+(rows.length-first)+' visibility samples');if(failure)break;
 }
}finally{
 const report={runtimeCommit,sourceAndToolsDirty:Boolean(dirty),sourceAndToolsChanges:dirty,renderer:g.renderer,kind:'depth-alpha-visibility-candidates',coverage:{every,samples:samples.length? samples:undefined,everyInputFrame:!samples.length&&every===1&&levels.every(l=>l.renderedPrefixFrames===l.inputFrames)&&!failure,all32Levels:levels.length===32,inputFrames:levels.reduce((n,l)=>n+l.inputFrames,0),renderedFrames:levels.reduce((n,l)=>n+l.renderedPrefixFrames,0),instrumentedFrames:rows.length,levels},pageErrors:g.errors,instrumentationErrors:rows.filter(r=>!r.instrumentationUnchanged),candidates:rows.filter(r=>r.candidates.length),rows,limits:'World/HUD alpha/depth visibility candidates at256x240; RGBA8 contribution precision1/255. Unsupported renderable types retained. Not a shape/lighting/flicker/z-fighting proof; sampling is never all-frame visual coverage.'};
 await writeFile(out,JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify({samples:rows.length,candidateFrames:report.candidates.length,instrumentationErrors:report.instrumentationErrors.length,pageErrors:g.errors.length}));await g.close();if(failure||g.errors.length)process.exitCode=1;
}

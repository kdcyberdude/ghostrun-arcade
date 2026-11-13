/** Headless STATE-ONLY replay of the combined-audit inventory: no browser, no pictures.
 * Uses the same state comparators as combined-monitor-audit.ts (strictCompare for original
 * entrances, LiveWorld1StateAudit for power-on recordings), stepping one Node Simulation per
 * recording with every recorded pad, continuously, never reseeding after a divergence. Native lag
 * frames (native-lag-frames.mjs) are skipped: no remake update, state unchecked.
 * Every picture verdict is 'unchecked'; the receipt schema is distinct so it can never be
 * registered as a combined state-and-picture result.
 *
 *   tsx tools/harness/native-state-replay.ts --monitor DISPLAY_DIR --out FILE [--levels 1-1] [--ids a,b] [--jobs 32]
 *
 * Workers run an esbuild bundle of this file under plain Node: tsx's keep-names transform
 * wraps every closure created inside the source-machine hot loop and made replay ~8x slower.
 *
 * --levels: per-frame verdicts are kept only for native frames of those levels (others are
 * 'unchecked'); replay stops after the last selected native frame, as in a scoped audit.
 */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import {spawn,execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';import type {Button} from '../../src/types.js';
import {decodeEntrance} from './native-entrance.mjs';import {nativeLagFrames} from './native-lag-frames.mjs';import {strictCompare,type StrictFrameObservation} from './native-strict.js';
import {LiveWorld1StateAudit,compareLiveWorld1Start,captureLiveWorld1State} from './native-continuous-state.js';

export const STATE_SCHEMA='smb-state-replay-v1';
const recovered='/home/kd/Desktop/proj/ghostrun/notes/smb-native-handoff/recovered-native';
const names:Button[]=['a','b','select','start','up','down','left','right'];
const sha=(b:any)=>createHash('sha256').update(b).digest('hex'),read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
/** Same level label rule as combined-monitor-audit.ts. */
export function levelAt(r:Uint8Array){const w=r[0x75f]+1,l=r[0x75c]+1;return [1,2,3].includes(r[0x770])&&w<=8&&l<=4?`${w}-${l}`:null;}
type Span={from:number;to:number;level:string|null;state:string;picture:'unchecked'};
function push(out:Span[],f:number,level:string|null,state:string){const last=out.at(-1);if(last&&last.to===f&&last.level===level&&last.state===state)last.to++;else out.push({from:f,to:f+1,level,state,picture:'unchecked'});}

export function replayState(input:{id:string;frames:number;padsSha256:string;initialRamSha256?:string},levels?:string[]){
 const started=performance.now(),original=input.id.startsWith('original:'),level=original?input.id.split(':')[1]:undefined;
 const dir=original?path.join(recovered,'original32/traces',level!):path.join(recovered,'moods/captures',input.padsSha256);
 const pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin')),initial=fs.readFileSync(path.join(dir,'initial.ram'));
 if(sha(pads)!==input.padsSha256||pads.length!==input.frames||ram.length!==pads.length*2048)throw Error('Native input/RAM authentication');
 if(sha(initial)!==(original?input.initialRamSha256:read(path.join(dir,'capture.json')).initialRamSha256))throw Error('Native initial RAM differs');
 const lag=new Set<number>(nativeLagFrames(ram)),labels=Array.from({length:pads.length},(_,f)=>levelAt(ram.subarray(f*2048,(f+1)*2048)));
 const selected=(f:number)=>!levels||levels.includes(labels[f]!);
 let end=pads.length;if(levels){end=0;for(let f=0;f<pads.length;f++)if(selected(f))end=f+1;}
 // Diagnostics mirror combined-monitor-audit.ts: strict summary (original) or continuous coverage (power-on),
 // plus the fields of the first selected state mismatch (the only state fields a first joint failure can name).
 const states:string[]=new Array(end).fill('unchecked');let start:any,strict:any,firstStateMismatch:{frame:number;fields:string[]}|null=null;
 const note=(f:number,status:string,fields:()=>string[])=>{states[f]=status;if(status==='mismatch'&&!firstStateMismatch&&selected(f))firstStateMismatch={frame:f,fields:fields()};};
 const continuous:any=original?undefined:{scope:'continuous World1-1 and source-owned boot/title',fullyComparedFrames:0,partiallyComparedFrames:0,uncheckedFrames:0,knownMismatchFrames:0,gaps:{}};
 if(original){
  const entrance=decodeEntrance(initial,read(path.join(recovered,'original32/entrances',level!,'entrance.json')));
  const audit=strictCompare(entrance,pads.subarray(0,end),ram.subarray(0,end*2048),level!,(row:StrictFrameObservation)=>note(row.frame,row.status,()=>row.fields),lag);
  strict={first:audit.first,firstCoverageGap:audit.firstCoverageGap,fields:audit.fields};
 }else{
  const sim:any=new Simulation(observedLevels());sim.twoPlayer=false;sim.reset(false);sim.events.length=0;
  const audit=new LiveWorld1StateAudit();start=compareLiveWorld1Start(initial,captureLiveWorld1State(sim,true));continuous.start=start;
  for(let f=0;f<end;f++){
   if(!lag.has(f)){sim.step(names.filter((_,b)=>pads[f]&(1<<b)),1);sim.events.length=0;}
   const live=audit.compare(ram.subarray(f*2048,(f+1)*2048),captureLiveWorld1State(sim));
   if(lag.has(f)){states[f]='unchecked';continue;} // the audit still reads the native row to keep its scene context
   note(f,live.status,()=>live.differences.map(d=>d.field));
   if(!live.gaps.length)continuous.fullyComparedFrames++;else if(live.checked.length)continuous.partiallyComparedFrames++;else continuous.uncheckedFrames++;
   if(live.status==='mismatch')continuous.knownMismatchFrames++;for(const gap of live.gaps){const g=continuous.gaps[gap]??={first:f,count:0};g.count++;}
  }
 }
 const spans:Span[]=[];let checked=0;
 for(let f=0;f<pads.length;f++){const keep=f<end&&selected(f);if(keep)checked++;push(spans,f,labels[f],keep?states[f]:'unchecked');}
 return {id:input.id,frames:pads.length,reseeded:false,nativeLagFrames:[...lag].filter(f=>f<end),replayedFrames:end,stateCheckedFrames:checked,spans,start,strict,continuous,firstStateMismatch,
  reference:{padsSha256:input.padsSha256,ramSha256:sha(ram),initialRamSha256:sha(initial)},seconds:(performance.now()-started)/1000};
}

/** Plain-Node esbuild bundle of this module (see header); caller removes the returned directory. */
export async function bundleStateReplay(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'smb-state-replay-')),file=path.join(dir,'native-state-replay.mjs');
 const {build}=await import('esbuild');await build({entryPoints:[fileURLToPath(import.meta.url)],bundle:true,platform:'node',format:'esm',target:'node18',outfile:file,logLevel:'warning'});
 return {dir,file};
}
/** One recording in a bundled child process; resolves to replayState's result. */
export function replayStateInWorker(bundle:string,monitor:string,id:string,levels?:string[]):Promise<ReturnType<typeof replayState>>{
 return new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,[bundle,'--worker','--monitor',monitor,'--out','-',...(levels?['--levels',levels.join(',')]:[]),'--ids',id],{stdio:['ignore','pipe','inherit']});
  let text='';p.stdout.on('data',d=>text+=d);p.on('error',reject);
  p.on('exit',code=>{try{const row=JSON.parse(text);if(code!==0||row.error)throw Error(row.error??'state worker exit '+code);resolve(row);}catch(e){reject(e);}});
 });
}

/** Hash of every runtime source/data file plus the comparators, so receipts name the build they measured. */
export function stateSourceHashes(game:string){
 const files=['tools/harness/native-state-replay.ts','tools/harness/native-strict.ts','tools/harness/native-strict-entities.ts','tools/harness/native-continuous-state.ts','tools/harness/native-entrance.mjs','tools/harness/native-lag-frames.mjs'];
 for(const dir of ['src','data'])for(const f of fs.readdirSync(path.join(game,dir),{recursive:true}) as string[])if(/\.(ts|json|mjs)$/.test(f))files.push(path.join(dir,f));
 return Object.fromEntries(files.sort().filter(f=>fs.existsSync(path.join(game,f))).map(f=>[f,sha(fs.readFileSync(path.join(game,f)))]));
}

if(import.meta.url===new URL(process.argv[1],'file:').href){
 const {values:a}=parseArgs({options:{monitor:{type:'string'},out:{type:'string'},levels:{type:'string'},ids:{type:'string'},jobs:{type:'string'},worker:{type:'boolean'}}});
 if(!a.monitor||!a.out)throw Error('--monitor DISPLAY_DIR --out FILE required');
 const inventoryFile=read(path.join(path.resolve(a.monitor),'combined-inputs.json')),inventory=inventoryFile.runs,levels=a.levels?.split(',').filter(Boolean);
 if(levels?.some(l=>!/^[1-8]-[1-4]$/.test(l)))throw Error('Bad --levels');
 const wanted=a.ids?new Set(a.ids.split(',')):undefined,selected=wanted?inventory.filter((r:any)=>wanted.has(r.id)):inventory;
 if(wanted&&selected.length!==wanted.size)throw Error('Unknown/duplicate ids');
 if(a.worker){ // One shard: JSON lines on stdout, one per recording.
  for(const input of selected){try{process.stdout.write(JSON.stringify(replayState(input,levels))+'\n');}catch(e){process.stdout.write(JSON.stringify({id:input.id,error:String(e)})+'\n');}}
  process.exit(0);
 }
 const game=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),repo=path.resolve(game,'../..');
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),dirty=execFileSync('git',['status','--porcelain','--','games/smb/src','games/smb/data','games/smb/tools/harness'],{cwd:repo,encoding:'utf8'}).trim()!=='';
 const sourceHashes=stateSourceHashes(game),began=Date.now();
 // Longest recordings first, round-robin into shards, so shards finish together.
 const jobs=Math.max(1,Math.min(Number(a.jobs??Math.max(1,os.cpus().length-2)),selected.length)),shards:any[][]=Array.from({length:jobs},()=>[]);
 [...selected].sort((x:any,y:any)=>y.frames-x.frames).forEach((r:any,i:number)=>shards[i%jobs].push(r));
 const runs:any[]=[],errors:any[]=[],{dir:bundleDir,file:bundle}=await bundleStateReplay();
 try{await Promise.all(shards.map(shard=>new Promise<void>((resolve,reject)=>{
  const p=spawn(process.execPath,[bundle,'--worker','--monitor',a.monitor!,'--out',a.out!,...(a.levels?['--levels',a.levels]:[]),'--ids',shard.map((r:any)=>r.id).join(',')],{stdio:['ignore','pipe','inherit']});
  let buffer='';p.stdout.on('data',d=>{buffer+=d;let i;while((i=buffer.indexOf('\n'))>=0){const row=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);(row.error?errors:runs).push(row);process.stderr.write(`\r${runs.length+errors.length}/${selected.length} recordings`);}});
  p.on('exit',code=>code===0?resolve():reject(Error('worker exit '+code)));p.on('error',reject);
 })));}finally{fs.rmSync(bundleDir,{recursive:true,force:true});}
 process.stderr.write('\n');
 const order=new Map<string,number>(inventory.map((r:any,i:number)=>[r.id,i]));runs.sort((x,y)=>order.get(x.id)!-order.get(y.id)!);
 const seconds=(Date.now()-began)/1000,replayed=runs.reduce((n,r)=>n+r.replayedFrames,0);
 const report={schema:STATE_SCHEMA,measures:'state-only',picture:'not compared',unit:'input-frame',protocol:'continuous-from-recorded-start',
  runtimeCommit:commit,runtimeDirty:dirty,sourceHashes,inventorySha256:inventoryFile.inventorySha256,scope:levels?{levels,frameSelection:'all-target-level-frames'}:null,
  recordings:selected.length,inventoryRecordings:inventory.length,runs,errors,
  timing:{jobs,wallSeconds:seconds,replayedFrames:replayed,cpuSeconds:runs.reduce((n,r)=>n+r.seconds,0),framesPerSecond:replayed/seconds},generatedAt:new Date().toISOString()};
 fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});fs.writeFileSync(a.out+'.partial',JSON.stringify(report)+'\n');fs.renameSync(a.out+'.partial',a.out);
 const count:Record<string,number>={};for(const r of runs)for(const s of r.spans)if(!levels||levels.includes(s.level))count[s.state]=(count[s.state]??0)+s.to-s.from;
 console.log(JSON.stringify({recordings:runs.length,errors:errors.length,state:count,...report.timing}));
 if(errors.length)process.exitCode=1;
}

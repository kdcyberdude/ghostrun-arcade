/** World1-1 ONLY diagnostic epoch catalog. All source1-1 frames are accounted;
 * supported native entrance snapshots are diagnostic reseeds, NEVER a continuous
 * POWER-ON proof. No other world's gameplay is simulated. */
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';import {compareRun} from './native-divergence.js';import {strictCompare} from './native-strict.js';
import {nativeAreaBindings,selectNativeAreaBinding} from './native-area-identity.js';import {moodNativeTimeline,nativeContext,ramLevel} from './native-mood-audit.js';import {hash,type MoodRun} from './native-mood-corpus.js';
const WORLD='1-1',roles=['level','area','dead','time','score','coins','cam','x','y','missing','extra','kind','position','state'];
const minimum=(values:(number|null|undefined)[])=>{const n=values.filter((x):x is number=>typeof x==='number');return n.length?Math.min(...n):null;};
export function world11Epochs(ram:Uint8Array){
 const timeline=moodNativeTimeline(ram),epochs=[];
 for(let index=0;index<timeline.loads.length;index++){
  const from=timeline.loads[index],r=ram.subarray(from*2048,(from+1)*2048);if(ramLevel(r)!==WORLD)continue;
  let to=timeline.loads[index+1]??ram.length/2048;
  for(let f=from;f<to;f++)if(ramLevel(ram.subarray(f*2048,(f+1)*2048))!==WORLD){to=f;break;}
  epochs.push({index,from,to});
 }
 return {epochs,spans:timeline.spans.filter(s=>s.level===WORLD),frames:timeline.spans.filter(s=>s.level===WORLD).reduce((n,s)=>n+s.to-s.from,0)};
}
function firstFailure(strict:ReturnType<typeof strictCompare>,legacy:ReturnType<typeof compareRun>){
 const frame=minimum([...roles.map(k=>strict.fields[k]),...Object.values(legacy.fields)]);if(frame===null)return null;
 const fields=[...new Set([...roles.filter(k=>strict.fields[k]===frame),...Object.entries(legacy.fields).filter(([,f])=>f===frame).map(([k])=>k)])];
 const actors=strict.mismatches.filter(m=>m.first===frame),sample=strict.samples.find(m=>m.frame===frame);
 return {frame,fields,actors,sample,legacy:legacy.at?.filter(a=>fields.some(f=>a.field===f||a.field.startsWith(f+' ')))};
}
function classify(first:NonNullable<ReturnType<typeof firstFailure>>,r:Uint8Array,previous:Uint8Array,area:string){
 const actor=first.actors[0],entity=actor?.kind??'mario';let rule:string;
 if(first.frame===0)rule='initialization-or-first-pass';
 else if(actor)rule=['missing','extra','kind'].includes(actor.code)?'enemy-birth-lifetime-slot':'enemy-motion-state';
 else if(first.fields.some(f=>f==='level'||f==='area'))rule='scene-identity';
 else if(r[14]!==8)rule=`controller-engine-${r[14]}`;
 else if(first.fields.includes('dead'))rule='player-death-contact';
 else if(first.fields.includes('coins'))rule='coin-probe-event';
 else if(first.fields.includes('score'))rule=r[0x26]||r[0x27]?'score-block-event':'score-award-event';
 else if(first.fields.includes('time'))rule='timer-clock';
 else if([0,1,2,3,4].some(s=>(r[0x491+s]&1)&&!(previous[0x491+s]&1)))rule='mario-enemy-contact';
 else rule='mario-motion-collision';
 return {key:`${area}:${rule}:${entity}:${first.fields.join('+')}`,rule,entity,area};
}
const levels=observedLevels(),level=levels.find(l=>l.id===WORLD)!;
function diagnose(ram:Buffer,pads:Buffer,from:number,to:number,receipt:Record<string,unknown>,out:string,key:string){
 const initial=ram.subarray((from-1)*2048,from*2048),input=pads.subarray(from,to),rows=ram.subarray(from*2048,to*2048),binding=receipt.areaBinding as any;
 const entrance=decodeEntrance(initial,receipt,binding),probe:any=new Simulation(levels);probe.reset(true);const initialization=initializeEntrance(probe,entrance);
 const legacy=compareRun(entrance,input,f=>rows.subarray(f*2048,(f+1)*2048),WORLD,true),strict=strictCompare(entrance,input,rows,WORLD),first=firstFailure(strict,legacy);
 const position=first?from+first.frame:undefined,current=position===undefined?undefined:ram.subarray(position*2048,(position+1)*2048),previous=position===undefined?undefined:ram.subarray((position-1)*2048,position*2048);
 return {role:'native-entrance-seeded-diagnostic-NOT-continuous',combinedPowerOnProof:false,sourceFrameOffset:from,endFrame:to,frames:input.length,initialRamSha256:hash(initial),inputSha256:hash(input),ramSha256:hash(rows),initialization,initialController:{currentAB:initial[10],previousAB:initial[13],saved:initial[0x6fc],firstPad:input[0]},legacy,strict:{status:strict.status,first:strict.first,fields:strict.fields,coverage:strict.coverage,diagnostics:strict.diagnostics,mismatches:strict.mismatches,samples:strict.samples.slice(0,8)},first:first&&{...first,sourceFrame:position,native:nativeContext(current!),previous:nativeContext(previous!),cluster:classify(first,current!,previous!,binding?.area??String(receipt.area??'main'))},reproduce:{captureKey:key,sourceFrameOffset:from,endFrame:to,outputRoot:out}};
}
export function auditWorld11Run(dir:string,run:MoodRun,out:string){
 const pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin')),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8'));
 if(pads.length!==run.frames||ram.length!==pads.length*2048||hash(pads)!==run.sha256||hash(ram)!==capture.ramSha256)throw Error(`capture integrity: ${run.sha256}`);
 const timeline=world11Epochs(ram),entries:any[]=[];
 for(const epoch of timeline.epochs){
  const r=ram.subarray(epoch.from*2048,(epoch.from+1)*2048),bindings=selectNativeAreaBinding(level,nativeAreaBindings(level).bindings,r[0xe7]+256*r[0xe8],r[0x71a]);
  const entry:any={index:epoch.index,loadFrame:epoch.from,endFrame:epoch.to,bindings,role:'native-entrance-seeded-diagnostic-NOT-continuous',combinedPowerOnProof:false,attempts:[]};let selected=-1;
  if(bindings.length===1){const seen=new Set<number>();for(let f=epoch.from;f<epoch.to;f++){
   const raw=ram.subarray(f*2048,(f+1)*2048);if(raw[0x770]!==1||raw[0x772]!==3||![7,8].includes(raw[14])||seen.has(raw[14]))continue;seen.add(raw[14]);
   try{const entrance=decodeEntrance(raw,{level:WORLD},bindings[0]),sim=new Simulation(levels);sim.reset(true);initializeEntrance(sim,entrance);selected=f;break;}catch(error){entry.attempts.push({frame:f,engine:raw[14],reason:String(error)});}
   if(seen.has(8))break; // no search for a later convenient pose
  }}
  if(selected>=0){const receipt={schema:'native-mood-entry-v1',level:WORLD,areaBinding:bindings[0],sourceFrameOffset:selected+1,sourcePadSha256:run.sha256,initialRamSha256:hash(ram.subarray(selected*2048,(selected+1)*2048)),initializationRole:'world1-gameplay-diagnostic',notReconstructed:['continuous POWER-ON control','unseeded hidden controller/engine state','native PPU picture']};
   try{entry.diagnostic=diagnose(ram,pads,selected+1,epoch.to,receipt,out,`${run.sha256}:${epoch.index}`);entry.receipt=receipt;}catch(error){entry.error=String(error);}
  }else entry.error=bindings.length!==1?`${bindings.length} area bindings`:'no supported first source7/8 snapshot';
  entry.uncomparedPrefixFrames=entry.diagnostic?entry.diagnostic.sourceFrameOffset-epoch.from:epoch.to-epoch.from;
  entry.uncomparedTailFrames=entry.diagnostic?entry.diagnostic.frames-entry.diagnostic.strict.coverage.frames:0;entries.push(entry);
 }
 const comparedFrames=entries.reduce((n,e)=>n+(e.diagnostic?.strict.coverage.frames??0),0);
 return {schema:'world1-gameplay-diagnostic-run-v1',sha256:run.sha256,sourceDirectory:dir,frames:pads.length,capture:{romSha256:capture.romSha256,ramSha256:capture.ramSha256,backendSha256:capture.backendSha256,binarySha256:capture.binarySha256},provenance:run.provenance,world11Frames:timeline.frames,otherWorldFramesNotAudited:pads.length-timeline.frames,spans:timeline.spans,entries,coverage:{combinedPowerOnProof:false,world11Frames:timeline.frames,diagnosticComparedFrames:comparedFrames,uncomparedWorld11Frames:timeline.frames-comparedFrames,epochFrames:timeline.epochs.reduce((n,e)=>n+e.to-e.from,0)}};
}
function writeExample(dir:string,run:any,entry:any){
 const d=entry.diagnostic,from=d.sourceFrameOffset,to=Math.min(d.endFrame,from+(d.first?.frame??0)+8),base=path.join(dir,run.sha256,String(entry.index).padStart(4,'0')),trace=path.join(base,'traces',WORLD),receipts=path.join(base,'receipts',WORLD),file=fs.openSync(path.join(run.sourceDirectory,'ram.bin'),'r'),initial=Buffer.alloc(2048),rows=Buffer.alloc((to-from)*2048);
 try{fs.readSync(file,initial,0,2048,(from-1)*2048);fs.readSync(file,rows,0,rows.length,from*2048);}finally{fs.closeSync(file);}
 const pads=fs.readFileSync(path.join(run.sourceDirectory,'pads.bin')).subarray(from,to);fs.mkdirSync(trace,{recursive:true});fs.mkdirSync(receipts,{recursive:true});fs.writeFileSync(path.join(trace,'initial.ram'),initial);fs.writeFileSync(path.join(trace,'ram.bin'),rows);fs.writeFileSync(path.join(trace,'pads.bin'),pads);fs.writeFileSync(path.join(receipts,'entrance.json'),JSON.stringify({...entry.receipt,role:d.role,fullEpochEndFrame:d.endFrame,clipEndFrame:to,clipPurpose:'first-failure focused reproduction; complete epoch remains cataloged and source input retained'},null,2)+'\n');return {traces:path.dirname(trace),entrances:path.dirname(receipts),frames:pads.length,sourceFrameOffset:from,endFrame:to};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{cache:{type:'string'},out:{type:'string'},'runtime-ref':{type:'string'},hashes:{type:'string'}}});if(!a.cache||!a.out||!a['runtime-ref'])throw Error('--cache --out --runtime-ref required');
 const runtimeCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),expected=execFileSync('git',['rev-parse',a['runtime-ref']],{encoding:'utf8'}).trim();if(runtimeCommit!==expected)throw Error('wrong runtime pin');
 const frozen=['src','data','tools/harness/native-entrance.mjs','tools/harness/native-strict.ts','tools/harness/native-strict-entities.ts','tools/harness/native-divergence.ts'];execFileSync('git',['diff','--exit-code','--',...frozen]);
 const inventory=JSON.parse(fs.readFileSync(path.join(a.cache,'inventory.json'),'utf8')),runs:MoodRun[]=inventory.runs.filter((r:MoodRun)=>!a.hashes||a.hashes.split(',').includes(r.sha256));fs.mkdirSync(a.out,{recursive:true});const file=path.join(a.out,'entries.jsonl');fs.writeFileSync(file,'');
 const clusters=new Map<string,any>(),results:any[]=[];
 for(const run of runs){const result=auditWorld11Run(path.join(a.cache,'captures',run.sha256),run,a.out);fs.appendFileSync(file,JSON.stringify(result)+'\n');results.push({sha256:run.sha256,coverage:result.coverage,epochs:result.entries.length});
  for(const e of result.entries){const first=e.diagnostic?.first;if(!first)continue;const c=first.cluster,old=clusters.get(c.key);if(old){old.episodes++;old.examples.length<5&&old.examples.push({sha256:run.sha256,index:e.index,sourceFrame:first.sourceFrame,localFrame:first.frame});}else{const example=writeExample(path.join(a.out,'examples'),result,e);clusters.set(c.key,{...c,episodes:1,examples:[{sha256:run.sha256,index:e.index,sourceFrame:first.sourceFrame,localFrame:first.frame}],reproduce:example});}}
  const summary={schema:'world1-gameplay-diagnostic-catalog-v1',runtimeCommit,auditToolSha256:hash(fs.readFileSync(new URL(import.meta.url))),role:'DIAGNOSTIC reseeds, NOT continuous POWER-ON combined proof',selectedRuns:runs.length,completedRuns:results.length,inventoryRuns:inventory.unique,coverage:{world11Frames:results.reduce((n,r)=>n+r.coverage.world11Frames,0),diagnosticComparedFrames:results.reduce((n,r)=>n+r.coverage.diagnosticComparedFrames,0),uncomparedWorld11Frames:results.reduce((n,r)=>n+r.coverage.uncomparedWorld11Frames,0)},runs:results,clusters:[...clusters.values()].sort((x,y)=>y.episodes-x.episodes)};
  fs.writeFileSync(path.join(a.out,'catalog.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({completed:results.length,total:runs.length,sha256:run.sha256,epochs:result.entries.length,clusters:clusters.size,coverage:result.coverage}));
 }
 execFileSync('git',['diff','--exit-code','--',...frozen]);if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==runtimeCommit)throw Error('runtime changed during audit');
}

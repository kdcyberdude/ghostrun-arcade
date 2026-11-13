/** Focused retained-input proof across two frozen Git sources; no game state is patched.
 * npx tsx tools/harness/native-water-camera-causality.ts --before b4c934e --after 117ef69
 *   --recording DIR --out evidence/water-camera-causality.json
 * DIR is a native-entrance-branch.py output containing traces/6-2 and entrances/6-2. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{before:{type:'string'},after:{type:'string'},recording:{type:'string'},out:{type:'string'}}});
if(!a.before||!a.after||!a.recording||!a.out)throw Error('--before, --after, --recording, --out required');
const game=fileURLToPath(new URL('../..',import.meta.url)),repo=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:game,encoding:'utf8'}).trim(),git=(args:string[])=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim(),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const level='6-2',dir=path.join(a.recording,'traces',level),entrance=path.join(a.recording,'entrances',level,'entrance.json'),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),initial=fs.readFileSync(path.join(dir,'initial.ram')),source=JSON.parse(fs.readFileSync(path.join(dir,'branch.json'),'utf8'));
if(sha(ram)!==source.ramSha256||sha(pads)!==source.padsSha256||sha(initial)!==source.initialRamSha256)throw Error('Native input receipt mismatch');
const row=(f:number)=>ram.subarray(f*2048,(f+1)*2048),names=['a','b','select','start','up','down','left','right'];
const native=(q:Buffer)=>({mode:q[0x770],task:q[0x772],engine:q[14],type:q[0x74e],pointer:q[0xe7]+q[0xe8]*256,x:q[0x6d]*256+q[0x86],y:(q[0xb5]-1)*256+q[0xce],camera:q[0x71a]*256+q[0x71c],time:q[0x7f8]*100+q[0x7f9]*10+q[0x7fa],playerBox:Array.from(q.subarray(0x4ac,0x4b0)),enemy0Box:Array.from(q.subarray(0x4b0,0x4b4)),enemy0Collision:q[0x491],slots:Array.from({length:5},(_,s)=>[q[15+s],q[22+s],q[0x6e+s]*256+q[0x87+s],q[0xcf+s]])});
const frames=new Set([2936,2937,3172,3335,3425,3498,3581,3582,3665,3666]),root=fs.mkdtempSync(path.join(os.tmpdir(),'smb-water-camera-')),results=[];
try{
 for(const [label,ref]of [['before',a.before],['after',a.after]] as [string,string][]){
  const target=path.join(root,label);fs.mkdirSync(target);const archive=path.join(root,label+'.tar');execFileSync('git',['archive','-o',archive,ref,'games/smb'],{cwd:repo});execFileSync('tar',['-xf',archive,'-C',target]);fs.unlinkSync(archive);
  const sourceGame=path.join(target,'games/smb');fs.symlinkSync(path.join(game,'node_modules'),path.join(sourceGame,'node_modules'));
  const {Simulation}=await import(sourceGame+'/src/simulation.ts'),{observedLevels}=await import(sourceGame+'/src/levels.ts'),{decodeEntrance,initializeEntrance}=await import(sourceGame+'/tools/harness/native-entrance.mjs'),{divergence}=await import(sourceGame+'/tools/harness/native-divergence.ts');
  const firsts=divergence(dir,entrance,level,false,false).fields,sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,JSON.parse(fs.readFileSync(entrance,'utf8'))));sim.step([],0);sim.inputs=[];
  const transitions=[],samples=[];let prior='';
  for(let frame=0;frame<=3666;frame++){
   sim.step(names.filter((_,b)=>pads[frame]&(1<<b)),1);const n=native(row(frame)),s={area:sim.area.id,phase:sim.phase,x:sim.player.x,y:sim.player.y-32,camera:sim.camera,time:sim.time,score:sim.score,coins:sim.coins,enemies:sim.enemies.filter((e:any)=>e.active&&!e.dead&&!e.slotFreed).map((e:any)=>({kind:e.kind,slot:e.enemySlot,x:e.x,y:e.y-24}))},key=`${n.mode}/${n.task}/${n.engine}/${n.pointer}/${s.area}/${s.phase}`;
   if(key!==prior&&frame>=2900)transitions.push({frame,native:{mode:n.mode,task:n.task,engine:n.engine,pointer:n.pointer,camera:n.camera},sim:{area:s.area,phase:s.phase,camera:s.camera}});prior=key;
   if(frames.has(frame))samples.push({frame,pad:pads[frame],native:n,sim:s});
  }
  results.push({label,commit:git(['rev-parse',ref]),sourceTree:git(['rev-parse',`${ref}:games/smb`]),firsts,transitions,samples});
 }
}finally{fs.rmSync(root,{recursive:true,force:true});}
// Fixed recorded-input audit assertions, never runtime rules or comparator exclusions.
if(results.some(r=>r.firsts.dead!==2937)||results[0].firsts.cam!==3666||results[1].firsts.cam!==3582)throw Error('Sources no longer reproduce the declared focused camera case');
const report={toolSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),node:process.version,schema:'native-water-camera-causality-v1',level,run:'water-down-strokes',source,nativeInput:{frames:pads.length,initialRamSha256:sha(initial),padsSha256:sha(pads),ramSha256:sha(ram)},upstream:{field:'dead',frame:2937,nativeEngine:11,modelPhase:'play',mechanism:'Native slot0 Blooper overlaps the cached player box and sets Enemy_CollisionBits; both sources retain the fitted optional roster and miss that hit.'},classification:'downstream-of-retained-native-death',reason:'Native resumes main gameplay3335; candidate incorrectly survives until3425 and returns mainplay3582, baseline survives until3498 and returns3666. Legacy camera compares only model main-area play against native engine8. The earlier camera first is the earlier resumption of this comparison after the same upstream missed death, not an independent camera rule regression.',nativeRows:[2936,2937].map(frame=>({frame,sha256:sha(row(frame)),gzip:zlib.gzipSync(row(frame)).toString('base64')})),results};
fs.writeFileSync(a.out,JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify({classification:report.classification,firsts:results.map(r=>({commit:r.commit,fields:r.firsts}))}));

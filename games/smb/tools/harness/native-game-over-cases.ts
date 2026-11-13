/** Extend authentic POWER-ON pads through GameOverMode, preserving every original input/RAM row. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {parseArgs} from 'node:util';
import {captureMoods,hash,type MoodRun} from './native-mood-corpus.js';import {decodeNativeGameOver,stepNativeGameOver} from '../../src/native-game-over.js';
const {values:a}=parseArgs({options:{cache:{type:'string'},out:{type:'string'},lab:{type:'string'},nesle:{type:'string'},rom:{type:'string'},fixture:{type:'string'}}});if(!a.cache||!a.out||!a.lab||!a.nesle||!a.rom||!a.fixture)throw Error('--cache --out --lab --nesle --rom --fixture required');
const inventory=JSON.parse(fs.readFileSync(path.join(a.cache,'inventory.json'),'utf8')),picks=new Map<string,any>();
for(const run of inventory.runs){
 const dir=path.join(a.cache,'captures',run.sha256),audit=JSON.parse(fs.readFileSync(path.join(dir,'audit.json'),'utf8')),span=audit.native.spans.find((s:any)=>s.mode===3);if(!span)continue;
 const fd=fs.openSync(path.join(dir,'ram.bin'),'r'),row=Buffer.alloc(2048);try{fs.readSync(fd,row,0,2048,span.from*2048);}finally{fs.closeSync(fd);}
 const key=row[0x759]?'time-up':row[0x747]?'held':'unheld';if(!picks.has(key))picks.set(key,{run,dir,frame:span.from});if(picks.size===3)break;
}
if(picks.size!==3)throw Error('Need authentic held, unheld and time-up game-over entries');
fs.mkdirSync(path.join(a.out,'inputs'),{recursive:true});const runs:MoodRun[]=[],branches:any[]=[];
for(const [kind,pick]of picks){
 const base=fs.readFileSync(path.join(pick.dir,'pads.bin')),pads=Buffer.concat([base,Buffer.alloc(900)]),file=path.join(a.out,'inputs',`${kind}-neutral.pads.bin`);fs.writeFileSync(file,pads);const sha=hash(pads);runs.push({sha256:sha,frames:pads.length,provenance:[{pads:file}]});branches.push({kind,variant:'neutral',sha256:sha,baseSha256:pick.run.sha256,baseFrames:base.length,sourceDirectory:pick.dir,gameOverFrame:pick.frame});
}
await captureMoods(runs,a.out,a.lab,a.nesle,a.rom,3);
for(const branch of [...branches]){
 const dir=path.join(a.out,'captures',branch.sha256),ram=fs.readFileSync(path.join(dir,'ram.bin')),base=fs.readFileSync(path.join(branch.sourceDirectory,'ram.bin'));if(!ram.subarray(0,base.length).equals(base))throw Error(`${branch.kind}: original native RAM prefix changed`);
 let task2=-1;for(let f=branch.gameOverFrame;f<ram.length/2048;f++)if(ram[f*2048+0x770]===3&&ram[f*2048+0x772]===2){task2=f;break;}if(task2<0)throw Error('Native GameOverInter not reached');
 const pads=fs.readFileSync(path.join(dir,'pads.bin'));pads[task2+1]=8;const file=path.join(a.out,'inputs',`${branch.kind}-start.pads.bin`);fs.writeFileSync(file,pads);const sha=hash(pads);runs.push({sha256:sha,frames:pads.length,provenance:[{pads:file}]});branches.push({...branch,variant:'start',sha256:sha,neutralSha256:branch.sha256,startFrame:task2+1});
}
await captureMoods(runs.slice(3),a.out,a.lab,a.nesle,a.rom,3);
const pack=(b:Uint8Array)=>zlib.gzipSync(b).toString('base64'),cases:any[]=[],diagnostics:any[]=[];
for(const branch of branches){
 const dir=path.join(a.out,'captures',branch.sha256),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),receipt=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8')),base=fs.readFileSync(path.join(branch.sourceDirectory,'ram.bin'));if(!ram.subarray(0,base.length).equals(base))throw Error(`${branch.kind}: baseline RAM mismatch`);
 if(branch.variant==='start'){const neutral=fs.readFileSync(path.join(a.out,'captures',branch.neutralSha256,'ram.bin'));if(!ram.subarray(0,branch.startFrame*2048).equals(neutral.subarray(0,branch.startFrame*2048)))throw Error('Start branch changed its common native prefix');}
 const events=[];let end=-1;
 for(let f=branch.gameOverFrame+1;f<ram.length/2048;f++){
  const p=ram.subarray((f-1)*2048,f*2048),r=ram.subarray(f*2048,(f+1)*2048);if(p[0x770]!==3){end=f-1;break;}
  const before=decodeNativeGameOver(p),after=decodeNativeGameOver(r),input={start:Boolean(r[0x6fc]&16),canContinue:Boolean(p[0x77a])&&p[0x761]<128,intervalTick:p[0x77f]===0},state={...before},effect=stepNativeGameOver(state,input);
  if(JSON.stringify(state)!==JSON.stringify(after)||effect.eventQueue!==undefined&&r[0xfc]!==effect.eventQueue)diagnostics.push({kind:branch.kind,variant:branch.variant,frame:f,before,input,state,after,effect,queue:r[0xfc]});
  events.push({frame:f,before,input,after,eventQueue:r[0xfc]});
 }
 if(end<0)throw Error('Extended native game over did not terminate');const initial=ram.subarray(branch.gameOverFrame*2048,(branch.gameOverFrame+1)*2048),window=ram.subarray((branch.gameOverFrame+1)*2048,(end+1)*2048),input=pads.subarray(branch.gameOverFrame+1,end+1);
 cases.push({branch,receipt,initialSha256:hash(initial),ramSha256:hash(window),padsSha256:hash(input),initial:pack(initial),ram:pack(window),pads:pack(input),events});
}
fs.writeFileSync(a.fixture,JSON.stringify({source:'POWER-ON extensions of authentic original mood pads. Original entire RAM prefix and Start-branch common prefix are byte-identical; no RAM or save-state writes.',cases,diagnostics})+'\n');console.log(JSON.stringify({cases:cases.length,rows:cases.reduce((n,c)=>n+c.events.length,0),diagnostics:diagnostics.length}));if(diagnostics.length)process.exitCode=1;

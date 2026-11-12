/** Sequential capture of retained model runs; no policy inference and no parallel browser jobs. */
import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import {once} from 'node:events';import {parseArgs} from 'node:util';import assert from 'node:assert/strict';
const {values:a}=parseArgs({options:{entrances:{type:'string'},out:{type:'string'},view:{type:'string',default:'2d'},resolution:{type:'string',default:'1K'}}});assert.ok(a.entrances&&a.out);await fs.mkdir(a.out,{recursive:true});const results=[];
for(let n=0;n<32;n++){
 const level=`${Math.floor(n/4)+1}-${n%4+1}`,source=path.resolve(a.entrances,level),out=path.resolve(a.out,level);let report;
 try{report=JSON.parse(await fs.readFile(path.join(out,'capture.json'),'utf8'));const receipt=JSON.parse(await fs.readFile(path.join(source,'entrance.json'),'utf8'));assert.equal(report.actionsSha256,receipt.actionsSha256);assert.equal(report.sourceFrameOffset,receipt.sourceFrameOffset);assert.equal(report.inputTransport,'direct-ppu');}catch(error){
  if(error.code!=='ENOENT')throw error;
  const log=await fs.open(path.resolve(a.out,`${level}.log`),'a');console.log(JSON.stringify({level,status:'recording',time:new Date().toISOString()}));
  const child=spawn(process.execPath,['tools/harness/record-game-audio.mjs','--transport','direct-ppu','--actions',path.join(source,'source-actions.json'),'--entrance',path.join(source,'entrance.json'),'--out',out,'--view',a.view,'--resolution',a.resolution],{stdio:['ignore',log.fd,log.fd]});const [code]=await once(child,'close');await log.close();
  if(code!==0){results.push({level,status:'failed',exitCode:code,log:path.resolve(a.out,`${level}.log`)});await fs.writeFile(path.resolve(a.out,'summary.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.at(-1)));continue;}
  report=JSON.parse(await fs.readFile(path.join(out,'capture.json'),'utf8'));
 }
 results.push({level,status:'recorded',frames:report.frames,requestedFrames:report.requestedFrames,fps:report.fps,inputTransport:report.inputTransport,sourceFrameOffset:report.sourceFrameOffset,outcome:report.outcome,nativeResult:report.entranceReceipt.nativeResult,actionsSha256:report.actionsSha256,initialRamSha256:report.entranceReceipt.initialRamSha256,maxAudioTimingErrorSeconds:report.maxAudioTimingErrorSeconds,video:path.join(out,'game.mp4'),manifest:path.join(out,'capture.json')});await fs.writeFile(path.resolve(a.out,'summary.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({level,status:'recorded',frames:report.frames,outcome:report.outcome,time:new Date().toISOString()}));
}
assert.equal(results.filter(r=>r.status==='recorded').length,32,'Some captures failed; inspect summary.json');

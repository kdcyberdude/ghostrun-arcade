/** Focused every-row continuous POWERON audit; no native initialization/injection.
 * --captures DIR --ids SHA,SHA --out JSON [--frames N]. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';import type {Button} from '../../src/types.js';
import {LiveWorld1StateAudit,captureLiveWorld1State,compareLiveWorld1Start} from './native-continuous-state.js';
const {values:a}=parseArgs({options:{captures:{type:'string'},ids:{type:'string'},out:{type:'string'},frames:{type:'string'}}});if(!a.captures||!a.ids||!a.out)throw Error('--captures, --ids and --out required');
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex'),names:Button[]=['a','b','select','start','up','down','left','right'],cases=[];
for(const id of a.ids.split(',')){
 const d=path.join(a.captures,id),pads=fs.readFileSync(path.join(d,'pads.bin')),ram=fs.readFileSync(path.join(d,'ram.bin')),initial=fs.readFileSync(path.join(d,'initial.ram')),receipt=JSON.parse(fs.readFileSync(path.join(d,'capture.json'),'utf8'));
 if(sha(pads)!==id||sha(ram)!==receipt.ramSha256||ram.length!==pads.length*2048)throw Error(`Native authentication failed ${id}`);
 const sim=new Simulation(observedLevels());sim.reset(false);const audit=new LiveWorld1StateAudit(),start=compareLiveWorld1Start(initial,captureLiveWorld1State(sim,true)),counts={match:0,mismatch:0,unchecked:0},firsts:Record<string,number>={};let sourceRamMismatches=0,sourceRamFirst:number|undefined;const frames=a.frames?Math.min(Number(a.frames),pads.length):pads.length;
 for(let f=0;f<frames;f++){
  sim.step(names.filter((_,bit)=>pads[f]&(1<<bit)),1);const raw=ram.subarray(f*2048,(f+1)*2048),r=audit.compare(raw,captureLiveWorld1State(sim));counts[r.status]++;
  for(const difference of r.differences)firsts[difference.field]??=f;for(const gap of r.gaps)firsts['unchecked:'+gap]??=f;
  if(!Buffer.from((sim as any).nativeGameplayTiming.machine.ram).equals(raw)){sourceRamMismatches++;sourceRamFirst??=f;}
 }
 cases.push({id,nativeRamSha256:receipt.ramSha256,nativeReceiptSha256:sha(fs.readFileSync(path.join(d,'capture.json'))),frames,start,counts,firsts,sourceRamMismatches,sourceRamFirst});console.error(`${id.slice(0,8)} ${frames} actual rows ${JSON.stringify(counts)}; sourceRAM mismatches${sourceRamMismatches}`);
}
const files=['src/simulation.ts','src/native-gameplay-timing.ts','src/native-source-machine.ts','src/native-source-ppu.ts','src/native-source-sprite-zero.ts','data/native-source-program.json','data/native-source-ppu-graphics.json','tools/harness/native-continuous-state.ts'],sourceHashes=Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(file))]));
fs.writeFileSync(a.out,JSON.stringify({schema:'native-gameplay-continuation-audit-v1',runtimeCommit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),workingDiffSha256:sha(execFileSync('git',['diff','HEAD','--','src','data'])),toolSha256:sha(fs.readFileSync(new URL(import.meta.url))),sourceHashes,method:'Every actual native row compared after one real controller step from model cold reset. No later native state correction; source machine all-RAM checks are read-only. Unsupported/mismatch rows remain individually counted.',cases},null,2)+'\n');

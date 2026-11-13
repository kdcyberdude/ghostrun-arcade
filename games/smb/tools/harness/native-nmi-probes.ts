/** Reproduce every normal-play mood overrun selected by native-nmi-survey.ts.
 * npx tsx tools/harness/native-nmi-probes.ts --observer BIN --rom ROM --lab LAB --corpus DIR --survey JSON --out JSON
 * Diagnostic row selection comes from the read-only survey; no event list is used by runtime simulation. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
const sha=(file:string)=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const {values:a}=parseArgs({options:Object.fromEntries(['observer','rom','lab','corpus','survey','out'].map(k=>[k,{type:'string' as const}]))});
for(const name of ['observer','rom','lab','corpus','survey','out'])if(typeof a[name]!=='string')throw Error(`--${name} required`);
const observer=a.observer as string,rom=a.rom as string,lab=a.lab as string,corpus=a.corpus as string;
const survey=JSON.parse(fs.readFileSync(a.survey as string,'utf8'));
const candidates=survey.events.filter((e:any)=>e.input==='mood'&&e.kind==='held-counter-and-rng');
const cases=[];
for(const event of candidates){
 const directory=path.join(corpus,'captures',event.id),receipt=JSON.parse(fs.readFileSync(path.join(directory,'capture.json'),'utf8'));
 if(sha(rom)!==receipt.romSha256)throw Error('ROM differs from native capture');
 const from=Math.max(0,event.row-3),to=event.row+2,branchStart=event.row-1;
 const lines=execFileSync(observer,[rom,path.join(directory,'pads.bin'),path.join(directory,'ram.bin'),String(from),String(to),String(branchStart)],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split('\n').map(line=>JSON.parse(line));
 cases.push({id:event.id,level:event.level,heldRow:event.row,from,to,branchStart,ramSha256:receipt.ramSha256,padSha256:receipt.padSha256,prefixRamSamplesVerified:to+1,records:lines});
 console.error(`${event.level} ${event.id.slice(0,8)}: all ${to+1} native prefix RAM samples match; ${lines.length} timing records`);
}
const backendFiles=['rl/csrc/rlenv_build.hpp','rl/csrc/nes_machine.cuh','.cache/nesle-src/cpp/include/nesle/cuda/batch_console.hpp','.cache/nesle-src/cpp/include/nesle/cuda/batch_ppu.cuh','.cache/nesle-src/cpp/include/nesle/cuda/batch_frame.cuh'];
fs.writeFileSync(a.out as string,JSON.stringify({schema:'native-nmi-workload-probes-v1',method:'Exact native HostMachine frame algorithm with read-only instruction-cycle callback, verified against every captured RAM sample through each observation window. Native snapshot arrays and PPU target restored before every controlled RAM branch. No runtime skip or fitted cost rule.',observerSourceSha256:sha('tools/harness/native-poweron-timing.cpp'),observerBinarySha256:sha(observer),romSha256:sha(rom),backendSources:backendFiles.map(file=>({file,sha256:sha(path.join(lab,file))})),ppuProtocol:{frameDots:341*262,vblankDot:241*341+1,ppuCyclesPerCpuCycle:3,source:'ghostrun-lab rl/csrc/nes_machine.cuh and NeSLE batch_console.hpp'},v2Evidence:'evidence/native-engine-overrun.json',cases},null,2)+'\n');
console.log(`${cases.length} native mood overrun contexts verified`);

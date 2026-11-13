/** Capture authentic initial HUD nametable bytes once per selected native entry.
 * npx tsx tools/harness/native-mood-hud.ts --cache CACHE --lab LAB --nesle NESLE --rom ROM [--hashes SHA,SHA]
 * Full CPU RAM replay must match the authenticated capture; no game/runtime correction stream is produced. */
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {parseArgs} from 'node:util';import {hash,type MoodRun} from './native-mood-corpus.js';
const {values:a}=parseArgs({options:{cache:{type:'string'},lab:{type:'string'},nesle:{type:'string'},rom:{type:'string'},hashes:{type:'string'}}});if(!a.cache||!a.lab||!a.nesle||!a.rom)throw Error('--cache, --lab, --nesle and --rom required');
const source=new URL('./native-poweron-hud.cpp',import.meta.url).pathname,binary=path.join(a.cache,'native-poweron-hud'),backend=[source,...['rlenv_build.hpp','rlenv_core.cuh','nes_machine.cuh'].map(f=>path.join(a.lab!,'rl/csrc',f)),path.join(a.nesle,'cpp/src/rom.cpp')],backendSha256=hash(Buffer.concat(backend.map(f=>fs.readFileSync(f)))),romSha256=hash(fs.readFileSync(a.rom));
if(romSha256!=='f61548fdf1670cffefcc4f0b7bdcdd9eaba0c226e3b74f8666071496988248de')throw Error('Expected the authenticated SMB JU PRG0 ROM');
execFileSync('c++',['-O2','-std=c++20','-ffp-contract=off',`-I${path.join(a.lab,'rl/csrc')}`,`-I${path.join(a.nesle,'cpp/include')}`,source,path.join(a.nesle,'cpp/src/rom.cpp'),'-o',binary],{stdio:'inherit'});
const runs:MoodRun[]=JSON.parse(fs.readFileSync(path.join(a.cache,'inventory.json'),'utf8')).runs;
for(const run of runs){if(a.hashes&&!a.hashes.split(',').includes(run.sha256))continue;
 const dir=path.join(a.cache,'captures',run.sha256),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8')),audit=JSON.parse(fs.readFileSync(path.join(dir,'audit.json'),'utf8')),out=path.join(dir,'ppu-hud');fs.mkdirSync(out,{recursive:true});
 const targets=[...new Set<number>(audit.entries.flatMap((e:any)=>[e.sourceFrameOffset,e.nativeEntryFrame===undefined?undefined:e.nativeEntryFrame+1]).filter((f:any)=>f!==undefined&&f<run.frames))].sort((a,b)=>a-b);fs.writeFileSync(path.join(out,'targets.txt'),targets.join('\n')+'\n');
 if(hash(fs.readFileSync(path.join(dir,'pads.bin')))!==run.sha256||capture.romSha256!==romSha256)throw Error(`native capture provenance mismatch: ${run.sha256}`);
 execFileSync(binary,[a.rom,path.join(dir,'pads.bin'),path.join(out,'targets.txt'),out],{stdio:'inherit'});
 if(hash(fs.readFileSync(path.join(out,'ram.bin')))!==capture.ramSha256)throw Error(`PPU observation changed native CPU replay: ${run.sha256}`);fs.unlinkSync(path.join(out,'ram.bin'));
 const entries=JSON.parse(fs.readFileSync(path.join(out,'hud.json'),'utf8'));fs.writeFileSync(path.join(out,'readout.json'),JSON.stringify({schema:'native-entry-hud-ram-v1',padSha256:run.sha256,ramSha256:capture.ramSha256,romSha256,backendSha256,binarySha256:hash(fs.readFileSync(binary)),clock:'PPU nametable0 after the visible source frame; matches the entry picture0, independently of the earlier CPU initial.ram snapshot',entries})+'\n');console.log(run.sha256,entries.length,'authenticated HUD snapshots');
}

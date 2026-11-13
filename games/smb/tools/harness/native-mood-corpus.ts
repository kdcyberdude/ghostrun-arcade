/** Inventory/deduplicate ignored mood pads, then resumably capture native POWER-ON RAM.
 * npx tsx tools/harness/native-mood-corpus.ts --root LAB/runs/rl --out CACHE [--capture --lab LAB --nesle NESLE --rom ROM --jobs 4 --limit N]
 * All pad bytes are applied once from cold reset; never env.start(), policy inference, entrance archives or warmup trimming. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {parseArgs} from 'node:util';
export type MoodRun={sha256:string,frames:number,provenance:{pads:string,summary?:unknown}[]};
export const hash=(b:Uint8Array)=>crypto.createHash('sha256').update(b).digest('hex');
export function hashFile(file:string){const h=crypto.createHash('sha256'),fd=fs.openSync(file,'r'),buffer=Buffer.alloc(1024*1024);try{for(let n;(n=fs.readSync(fd,buffer,0,buffer.length,null));)h.update(buffer.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
export function moodInventory(root:string):MoodRun[]{
 const groups=new Map<string,MoodRun>();
 function walk(dir:string){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile()&&/[/\\]eval[/\\]it\d+[/\\]smb_mood\d+\.pads\.bin$/.test(file)){
  const b=fs.readFileSync(file),sha=hash(b),run=groups.get(sha)??{sha256:sha,frames:b.length,provenance:[]};
  const summaryFile=path.join(dir,'summary.json'),mood=Number(entry.name.match(/mood(\d+)/)![1]);let summary;
  if(fs.existsSync(summaryFile)){const rows=JSON.parse(fs.readFileSync(summaryFile,'utf8'));summary=Array.isArray(rows)?rows.find(r=>r.game==='smb'&&r.mood===mood):undefined;}
  run.provenance.push({pads:path.resolve(file),...(summary===undefined?{}:{summary})});groups.set(sha,run);
 }}}
 walk(path.resolve(root));return [...groups.values()];
}
function nativeCapture(binary:string,rom:string,pads:string,out:string){return new Promise<void>((resolve,reject)=>{const p=spawn(binary,[rom,pads,out],{stdio:['ignore','pipe','pipe']});let stderr='';p.stderr.on('data',b=>stderr+=b);p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(`capture exited ${code}: ${stderr}`)));});}
export async function captureMoods(runs:MoodRun[],out:string,lab:string,nesle:string,rom:string,jobs:number){
 fs.mkdirSync(out,{recursive:true});const source=new URL('./native-poweron.cpp',import.meta.url),binary=path.join(out,'native-poweron');
 const backendFiles=[source.pathname,...['rlenv_build.hpp','rlenv_core.cuh','nes_machine.cuh'].map(s=>path.join(lab,'rl/csrc',s)),path.join(nesle,'cpp/src/rom.cpp')];
 const backendSha256=hash(Buffer.concat(backendFiles.map(s=>fs.readFileSync(s)))),romSha256=hash(fs.readFileSync(rom));
 if(romSha256!=='f61548fdf1670cffefcc4f0b7bdcdd9eaba0c226e3b74f8666071496988248de')throw Error('Expected the SMB JU PRG0 reference ROM');
 if(!fs.existsSync(binary)||!fs.existsSync(binary+'.sha256')||fs.readFileSync(binary+'.sha256','utf8')!==backendSha256){execFileSync('c++',['-O2','-std=c++20','-ffp-contract=off',`-I${path.join(lab,'rl/csrc')}`,`-I${path.join(nesle,'cpp/include')}`,source.pathname,path.join(nesle,'cpp/src/rom.cpp'),'-o',binary],{stdio:'inherit'});fs.writeFileSync(binary+'.sha256',backendSha256);}
 const binarySha256=hash(fs.readFileSync(binary)),queue=[...runs];let complete=0;
 await Promise.all(Array.from({length:jobs},async()=>{for(let run;run=queue.shift();){
  const dir=path.join(out,'captures',run.sha256),receipt=path.join(dir,'capture.json');
  if(fs.existsSync(receipt)){const old=JSON.parse(fs.readFileSync(receipt,'utf8'));if(old.backendSha256===backendSha256&&old.romSha256===romSha256&&old.padSha256===run.sha256&&fs.statSync(path.join(dir,'ram.bin')).size===run.frames*2048){old.provenance=run.provenance;old.binarySha256=binarySha256;fs.writeFileSync(receipt,JSON.stringify(old,null,2)+'\n');console.log(JSON.stringify({cached:run.sha256,frames:run.frames}));continue;}}
  fs.mkdirSync(dir,{recursive:true});const tmp=path.join(dir,'partial');fs.mkdirSync(tmp,{recursive:true});
  const pads=run.provenance[0].pads;if(hash(fs.readFileSync(pads))!==run.sha256)throw Error(`pad content changed: ${pads}`);
  const started=Date.now();await nativeCapture(binary,rom,pads,tmp);
  const initial=fs.readFileSync(path.join(tmp,'initial.ram')),ram=fs.readFileSync(path.join(tmp,'ram.bin'));
  if(initial.length!==2048||!initial.every(v=>v===255)||ram.length!==run.frames*2048)throw Error(`incomplete/non-POWER-ON capture ${run.sha256}`);
  for(const file of ['initial.ram','ram.bin'])fs.renameSync(path.join(tmp,file),path.join(dir,file));fs.copyFileSync(pads,path.join(dir,'pads.bin'));fs.rmdirSync(tmp);
  const result={schema:'native-poweron-capture-v1',padSha256:run.sha256,frames:run.frames,romSha256,backendSha256,binarySha256,initialRamSha256:hash(initial),ramSha256:hash(ram),powerOn:'HostMachine cold reset; CPU RAM FF; PPU dot0; first target vblank241:1; no hidden frames',padBits:['A','B','Select','Start','Up','Down','Left','Right'],provenance:run.provenance};
  fs.writeFileSync(receipt,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({captured:run.sha256,frames:run.frames,milliseconds:Date.now()-started,complete:++complete,total:runs.length}));
 }}));
}
export async function captureMoodPixels(runs:MoodRun[],out:string,lab:string,nesle:string,rom:string){
 const binary=path.join(out,'native-poweron-pixels'),source=new URL('./native-poweron-pixels.cpp',import.meta.url).pathname;
 execFileSync('c++',['-O2','-std=c++20','-ffp-contract=off',`-I${path.join(lab,'rl/csrc')}`,`-I${path.join(nesle,'cpp/include')}`,source,path.join(nesle,'cpp/src/rom.cpp'),'-o',binary],{stdio:'inherit'});
 for(const run of runs){
  const dir=path.join(out,'captures',run.sha256),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8')),pixelDir=path.join(dir,'pixels'),receipt=path.join(pixelDir,'pixels.json');
  if(fs.existsSync(receipt)){const old=JSON.parse(fs.readFileSync(receipt,'utf8'));if(old.ramSha256===capture.ramSha256&&old.frames===run.frames&&fs.existsSync(path.join(pixelDir,'pixels.bin')))continue;}
  fs.mkdirSync(pixelDir,{recursive:true});await nativeCapture(binary,rom,run.provenance[0].pads,pixelDir);
  const ram=fs.readFileSync(path.join(pixelDir,'ram.bin'));if(hash(ram)!==capture.ramSha256)throw Error('Rendering changed native RAM replay');fs.unlinkSync(path.join(pixelDir,'ram.bin'));
  if(fs.statSync(path.join(pixelDir,'pixels.bin')).size!==run.frames*240*224||fs.statSync(path.join(pixelDir,'emph.bin')).size!==run.frames*224)throw Error('Incomplete native picture stream');
  fs.writeFileSync(receipt,JSON.stringify({schema:'native-poweron-pixels-v1',step:1,width:240,height:224,frames:run.frames,padSha256:run.sha256,ramSha256:capture.ramSha256,pixelsSha256:hashFile(path.join(pixelDir,'pixels.bin')),emphasisSha256:hashFile(path.join(pixelDir,'emph.bin')),format:'lossless NES palette indices and per-row emphasis, one binary frame per source pad'},null,2)+'\n');
  console.log(JSON.stringify({pixels:run.sha256,frames:run.frames}));
 }
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{root:{type:'string'},out:{type:'string'},capture:{type:'boolean'},pixels:{type:'boolean'},hashes:{type:'string'},lab:{type:'string'},nesle:{type:'string'},rom:{type:'string'},jobs:{type:'string',default:'2'},limit:{type:'string'}}});
 if(!a.root||!a.out)throw Error('--root and --out required');const runs=moodInventory(a.root);fs.mkdirSync(a.out,{recursive:true});
 const inventory={schema:'native-mood-corpus-v1',root:path.resolve(a.root),files:runs.reduce((n,r)=>n+r.provenance.length,0),unique:runs.length,frames:runs.reduce((n,r)=>n+r.frames,0),runs};fs.writeFileSync(path.join(a.out,'inventory.json'),JSON.stringify(inventory,null,2)+'\n');console.log(JSON.stringify({files:inventory.files,unique:inventory.unique,frames:inventory.frames}));
 if(a.capture||a.pixels){if(!a.lab||!a.nesle||!a.rom)throw Error('--capture requires --lab, --nesle, --rom');const jobs=Number(a.jobs);if(!Number.isInteger(jobs)||jobs<1)throw Error('--jobs must be positive');const selected=a.hashes?runs.filter(r=>a.hashes!.split(',').includes(r.sha256)):a.limit?runs.slice(0,Number(a.limit)):runs;if(a.capture)await captureMoods(selected,a.out,a.lab,a.nesle,a.rom,jobs);if(a.pixels)await captureMoodPixels(selected,a.out,a.lab,a.nesle,a.rom);}
}

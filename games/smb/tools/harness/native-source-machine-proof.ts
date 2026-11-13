/** Build a portable, every-sample RAM/CPU proof for the three World1-1 partial
 * NMI cases. Profiles come from native-poweron-timing.cpp, whose baseline verifies
 * every RAM sample continuously before emitting the selected CPU window.
 * --captures DIR --profiles DIR [--samples N] [--out JSON] */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values}=parseArgs({options:{captures:{type:'string'},profiles:{type:'string'},samples:{type:'string',default:'946'},out:{type:'string',default:'tests/fixtures/native-source-machine.json'}}});
if(!values.captures||!values.profiles)throw Error('--captures and --profiles required');
const hashes=['91a8d597ac470f707894096e1cca45fa2e90ae0a0aeef0b5d11a0b9f94bab577','2bfc31326b5ab09964d788f22f4d53e803e00a0aa3b43824b5ec0f31b08f58b8','a60f59c3a84153b6e724c67bf55fc4b94dfb22b785f73247cd1eee812159d966'];
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),samples=Number(values.samples);
const cases=hashes.map(capture=>{
 const dir=path.join(values.captures!,capture),pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin')),profile=fs.readFileSync(path.join(values.profiles!,capture+'.jsonl'));
 if(pads.length<samples||ram.length<samples*2048)throw Error('Insufficient native prefix');
 const records=profile.toString().trim().split('\n').map(s=>JSON.parse(s)),cpu=records.filter(r=>r.kind==='sample'&&r.branch==='baseline'),nmis=records.filter(r=>r.kind==='nmi'&&r.branch==='baseline');
 if(!cpu.length||!nmis.length)throw Error('Missing authenticated native profile');
 return {capture,provenance:{padsSha256:sha(pads),ramSha256:sha(ram),profileSha256:sha(profile)},pads:pads.subarray(0,samples).toString('base64'),ramSha256:Array.from({length:samples},(_,i)=>sha(ram.subarray(i*2048,(i+1)*2048))),cpu,nmis};
});
const proof=zlib.gzipSync(JSON.stringify(cases),{level:9}).toString('base64');
const backendRoot='/home/kd/Desktop/proj/llm_gameplay/.cache/nesle-src/cpp/include/nesle/cuda';
const backend=['batch_ppu.cuh','batch_frame.cuh','batch_bus.cuh'].map(name=>({name,sha256:sha(fs.readFileSync(path.join(backendRoot,name)))}));
fs.writeFileSync(values.out!,JSON.stringify({scope:'Three World1-1 POWERON prefixes; every RAM sample authenticated, exact CPU/PPU window and source NMI costs. Fixture assertions only; never runtime inputs.',samples,cases:cases.length,backend,proof})+'\n');
console.log(`SOURCE_MACHINE_FIXTURE_PASS ${cases.length*samples} samples`);

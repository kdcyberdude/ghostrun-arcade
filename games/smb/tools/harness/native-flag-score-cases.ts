/** Retain complete native mood entry epochs for end-level score/parser regressions. No mid-run seeds. */
import fs from 'node:fs';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';import {moodNativeTimeline,ramLevel} from './native-mood-audit.js';import {nativeAreaBindings,selectNativeAreaBinding} from './native-area-identity.js';
const {values:a}=parseArgs({options:{cache:{type:'string'},hashes:{type:'string'},out:{type:'string',default:'tests/fixtures/native-flag-score-cases.json'}}});if(!a.cache||!a.hashes)throw Error('--cache and --hashes required');
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),pack=(b:Uint8Array)=>gzipSync(b).toString('base64'),levels=observedLevels(),cases=[];
for(const sha of a.hashes.split(',')){
 const dir=path.join(a.cache,'captures',sha),pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin')),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8'));if(hash(pads)!==sha||hash(ram)!==capture.ramSha256)throw Error(`Native capture integrity ${sha}`);
 const timeline=moodNativeTimeline(ram),load=timeline.loads[0],end=timeline.loads[1]??pads.length,source=ram.subarray(load*2048,(load+1)*2048),level=ramLevel(source),model=levels.find(l=>l.id===level)!,bindings=selectNativeAreaBinding(model,nativeAreaBindings(model).bindings,source[0xe7]+256*source[0xe8],source[0x71a]);if(bindings.length!==1)throw Error('Ambiguous native initial area');
 let initialFrame=-1,entrance;const seen=new Set<number>();for(let f=load;f<end;f++){
  const r=ram.subarray(f*2048,(f+1)*2048);if(r[0x770]!==1||r[0x772]!==3||![7,8].includes(r[14])||seen.has(r[14]))continue;seen.add(r[14]);
  try{const e=decodeEntrance(r,{level},bindings[0]),sim=new Simulation(levels);sim.reset(true);initializeEntrance(sim,e);initialFrame=f;entrance=e;break;}catch(error){if(r[14]===8)throw error;}
 }
 if(initialFrame<0)throw Error('No supported native entry');const initial=ram.subarray(initialFrame*2048,(initialFrame+1)*2048),segmentPads=pads.subarray(initialFrame+1,end),segmentRam=ram.subarray((initialFrame+1)*2048,end*2048);
 cases.push({level,sourcePadSha256:sha,captureRamSha256:capture.ramSha256,captureReceiptSha256:hash(Buffer.from(JSON.stringify(capture))),binding:bindings[0],initialFrame,sourceFrameOffset:initialFrame+1,endFrame:end,initialRamSha256:hash(initial),padsSha256:hash(segmentPads),ramSha256:hash(segmentRam),initial:pack(initial),pads:pack(segmentPads),ram:pack(segmentRam),entrance});
}
fs.writeFileSync(a.out,JSON.stringify({source:'Unchanged POWER-ON mood RAM/pads, first supported native entry only, entire first InitializeArea epoch retained. No flag/award/birth reseeding.',cases})+'\n');

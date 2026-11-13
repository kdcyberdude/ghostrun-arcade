/** Native placed-Lakitu initialization rows and retained slot bytes across all inputs.
 * npx tsx tools/harness/native-lakitu-birth-events.ts --traces DIR --corpus DIR --out JSON */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import data from '../../data/native-lakitu.json';
import {observedLevels} from '../../src/levels.js';import {Simulation} from '../../src/simulation.js';import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';import {nativeAreaBindings,selectNativeAreaBinding} from './native-area-identity.js';import {moodNativeTimeline} from './native-mood-audit.js';
const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'}}});if(!a.out)throw Error('--out required');
const sources:{kind:string;id:string;directory:string}[]=[];
if(a.traces)for(const id of fs.readdirSync(a.traces).sort())if(fs.existsSync(path.join(a.traces,id,'ram.bin')))sources.push({kind:'v2',id,directory:path.join(a.traces,id)});
if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')).sort())sources.push({kind:'mood',id,directory:path.join(a.corpus,'captures',id)});
const receipts=[],events:any[]=[],reappearances=[],diagnostics:any[]=[],replays:any[]=[],pending:any[]=[];let frames=0;
const pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64');
const state=(r:Uint8Array,s:number)=>({flag:r[15+s],id:r[22+s],state:r[30+s],box:r[0x49a+s],x:r[0x6e+s]*256+r[0x87+s],xFraction:r[0x401+s],y:r[0xcf+s],speed:r[0x58+s],direction:r[0x46+s],vertical:r[0xa0+s],force:r[0x434+s],fraction:r[0x417+s]});
for(const source of sources){
 const bytes=fs.readFileSync(path.join(source.directory,'ram.bin')),initial=fs.readFileSync(path.join(source.directory,'initial.ram')),ramSha256=createHash('sha256').update(bytes).digest('hex');frames+=bytes.length/2048;
 const capture=path.join(source.directory,'capture.json');if(fs.existsSync(capture)&&JSON.parse(fs.readFileSync(capture,'utf8')).ramSha256!==ramSha256)throw Error(`RAM changed ${source.id}`);receipts.push({input:source.kind,id:source.id,frames:bytes.length/2048,ramSha256});
 for(let row=0;row<bytes.length/2048;row++){
  const r=bytes.subarray(row*2048,(row+1)*2048),p=row?bytes.subarray((row-1)*2048,row*2048):initial;if(r[0x770]!==1||r[0x772]!==3)continue;
  const levelId=`${r[0x75f]+1}-${r[0x75c]+1}`,camera=r[0x71a]*256+r[0x71c],pointer=r[0xe9]+r[0xea]*256;
  if(p[14]===8&&r[14]===8&&!p[0x747]&&!r[0x747]&&p[0x71f]!==7&&!p[0x6cd]&&p[0x6cb]&&r[9]===((p[9]+1)&255)&&Array.from(p.subarray(15,20)).some(f=>!f)){
   const record=data.levels.find(e=>e.level===levelId&&e.pointer===pointer&&e.x>=camera+255&&e.x<=((camera+303)&~15)&&p[0x739]<=e.offset&&r[0x739]===e.offset);
   if(record){const births=Array.from({length:5},(_,s)=>s).filter(s=>r[15+s]&&(!p[15+s]||r[22+s]!==p[22+s]));pending.push({input:source.kind,id:source.id,level:levelId,row,record,camera,parserBefore:p[0x71f]&7,queueBefore:p[0x6cd],hard:p[0x6cc],primaryHard:p[0x76a],vine:p[0x398],buffer:p[0x6cb],timerBefore:p[0x78f],timerAfter:r[0x78f],beforeOffset:p[0x739],afterOffset:r[0x739],pageBefore:p[0x73a],selectedBefore:p[0x73b],pageAfter:r[0x73a],selectedAfter:r[0x73b],flagsBefore:Array.from(p.subarray(15,20)),idsBefore:Array.from(p.subarray(22,27)),flagsAfter:Array.from(r.subarray(15,20)),idsAfter:Array.from(r.subarray(22,27)),births:births.map(s=>({slot:s,id:r[22+s]}))});}
  }
  for(let slot=0;slot<5;slot++){
   if(!r[15+slot]||r[22+slot]!==17)continue;
   const before=state(p,slot),after=state(r,slot);if(before.flag&&before.id===17&&Math.abs(after.x-before.x)<64)continue;
   const level=`${r[0x75f]+1}-${r[0x75c]+1}`,pointer=r[0xe9]+r[0xea]*256,record=data.levels.find(e=>e.level===level&&e.pointer===pointer&&e.x===after.x),context={input:source.kind,id:source.id,level,row,slot,frame:r[9],engine:r[14],camera:r[0x71a]*256+r[0x71c],parserBefore:p[0x71f],parserAfter:r[0x71f],beforeOffset:p[0x739],afterOffset:r[0x739],pageBefore:p[0x73a],selectedBefore:p[0x73b],pageAfter:r[0x73a],selectedAfter:r[0x73b],pointer,bufferBefore:p[0x6cb],bufferAfter:r[0x6cb],reappear:r[0x6d1],flagsBefore:Array.from(p.subarray(15,20)),flagsAfter:Array.from(r.subarray(15,20)),before,after};
   if(after.box===8){reappearances.push(context);continue;}
   if(!record||after.box!==3||after.state||after.y!==record.y||after.speed||after.vertical||after.force||after.direction!==2||after.xFraction!==before.xFraction||after.fraction!==before.fraction||context.reappear)diagnostics.push(context);
   events.push({...context,record,beforeRam:pack(p),afterRam:pack(r),nextRam:row+1<bytes.length/2048?pack(bytes.subarray((row+1)*2048,(row+2)*2048)):undefined});
  }
 }
 const placed=events.filter(e=>e.input===source.kind&&e.id===source.id);
 if(placed.length){
  const pads=fs.readFileSync(path.join(source.directory,'pads.bin')),loads=[-1,...moodNativeTimeline(bytes).loads],groups=new Map<number,any[]>();
  for(const e of placed){const load=loads.filter(f=>f<=e.row).at(-1)!;if(!groups.has(load))groups.set(load,[]);groups.get(load)!.push(e);}
  for(const [load,births]of groups){
   const level=observedLevels().find(l=>l.id===births[0].level)!,end=Math.max(...births.map(e=>e.row))+2;let initialFrame=-2,raw:Uint8Array|undefined,receipt:any;const seen=new Set<number>();
   for(let frame=load;frame<births[0].row;frame++){
    const r=frame<0?initial:bytes.subarray(frame*2048,(frame+1)*2048);if(r[0x770]!==1||r[0x772]!==3||![7,8].includes(r[14])||seen.has(r[14]))continue;seen.add(r[14]);
    const binding=selectNativeAreaBinding(level,nativeAreaBindings(level).bindings,r[0xe7]+r[0xe8]*256,r[0x71a]);if(binding.length!==1)throw Error('Ambiguous source birth entry');
    const candidate={schema:'native-mood-entry-v1',level:level.id,sourceFrameOffset:frame+1,areaBinding:binding[0],method:'First native engine7/8 row after InitializeArea; no later-pose search.'};
    try{const sim=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(r,candidate));raw=r;receipt=candidate;initialFrame=frame;break;}catch(error){if(seen.has(8))throw error;}
   }
   if(!raw)throw Error('No supported native entry before placed Lakitu birth');
   const prefix=bytes.subarray((initialFrame+1)*2048,end*2048);replays.push({input:source.kind,id:source.id,level:level.id,load,sourceFrameOffset:initialFrame+1,births:births.map(e=>({row:e.row,slot:e.slot,after:e.after})),frames:end-initialFrame-1,receipt,initialRam:pack(raw),pads:pack(pads.subarray(initialFrame+1,end)),ram:pack(prefix),ramSha256:createHash('sha256').update(prefix).digest('hex')});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'All newly active native slot0..4/id17 rows. Placed InitLakitu hasBBox3; frenzy SetupLakitu reappearance changesBBox8 and is classified separately. Source ROM record positions/offsets, native flags/09/0E/parser/06CB/slot order and retained X/Y fractions, never first-row exclusions.',inputs:sources.length,frames,receipts,events,reappearances,replays,pending,diagnostics},null,2)+'\n');console.log(JSON.stringify({inputs:sources.length,frames,placed:events.length,replays:replays.length,pending:pending.length,zeroPending:pending.filter(e=>e.timerBefore===0).length,reappearances:reappearances.length,diagnostics:diagnostics.length}));

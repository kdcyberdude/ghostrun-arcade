/** Native PlayerChangeSize/InjuryBlink/FireFlower timer and completion rows.
 * npx tsx tools/harness/native-player-task-events.ts --traces DIR --corpus DIR --out JSON
 * Optional --replay-entry DIR --replay-level L --replay-frames N retains a full prefix. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
import {nativeTransformStep,type NativeTransform} from '../../src/native-player-task.js';
const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'},'replay-entry':{type:'string'},'replay-level':{type:'string'},'replay-frames':{type:'string'}}});if(!a.out)throw Error('--out required');
const sources:{kind:string;id:string;directory:string}[]=[];
if(a.traces)for(const id of fs.readdirSync(a.traces).sort())if(fs.existsSync(path.join(a.traces,id,'ram.bin')))sources.push({kind:'v2',id,directory:path.join(a.traces,id)});
if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')).sort())sources.push({kind:'mood',id,directory:path.join(a.corpus,'captures',id)});
const receipts=[],rows=[],completions=[],diagnostics=[];let frames=0;const taskKinds:Record<number,NativeTransform>={9:'grow',10:'shrink',12:'fire'},ends={grow:196,shrink:200,fire:192};
for(const source of sources){
 const bytes=fs.readFileSync(path.join(source.directory,'ram.bin')),initial=fs.readFileSync(path.join(source.directory,'initial.ram')),ramSha256=createHash('sha256').update(bytes).digest('hex');frames+=bytes.length/2048;
 const capture=path.join(source.directory,'capture.json');if(fs.existsSync(capture)&&JSON.parse(fs.readFileSync(capture,'utf8')).ramSha256!==ramSha256)throw Error(`RAM changed ${source.id}`);receipts.push({input:source.kind,id:source.id,frames:bytes.length/2048,ramSha256});
 for(let row=0;row<bytes.length/2048;row++){
  const r=bytes.subarray(row*2048,(row+1)*2048),p=row?bytes.subarray((row-1)*2048,row*2048):initial,kind=taskKinds[p[14]];
  if(!kind||p[0x770]!==1||p[0x772]!==3||r[0x770]!==1||r[0x772]!==3)continue;
  const before={engine:p[14],timer:p[0x747],interval:p[0x77f],frame:p[9]},after={engine:r[14],timer:r[0x747],interval:r[0x77f],frame:r[9]},next=nativeTransformStep(kind,before.timer-ends[kind]),e={input:source.kind,id:source.id,row,level:`${r[0x75f]+1}-${r[0x75c]+1}`,kind,before,after};rows.push(e);
  if(after.timer!==(next.done?0:next.timer)||after.interval!==before.interval||after.frame!==((before.frame+1)&255)||after.engine!==(next.done?8:before.engine))diagnostics.push({...e,predicted:next});
  if(next.done)completions.push({...e,beforeRam:zlib.gzipSync(p,{level:9}).toString('base64'),afterRam:zlib.gzipSync(r,{level:9}).toString('base64')});
 }
}
let replay;
if(a['replay-entry']){
 const entry=a['replay-entry'],level=a['replay-level'];if(!level||!a['replay-frames'])throw Error('replay level/frames required');
 const directory=path.join(entry,'traces',level),receipt=JSON.parse(fs.readFileSync(path.join(entry,'receipts',level,'entrance.json'),'utf8')),initial=fs.readFileSync(path.join(directory,'initial.ram')),pads=fs.readFileSync(path.join(directory,'pads.bin')),ram=fs.readFileSync(path.join(directory,'ram.bin')),n=Number(a['replay-frames']),pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64');
 if(!Number.isInteger(n)||n<1||n>pads.length||n*2048>ram.length)throw Error('Invalid replay frames');
 replay={capture:path.basename(path.dirname(path.dirname(entry))),entry:path.basename(entry),level,frames:n,receipt,initialRam:pack(initial),pads:pack(pads.subarray(0,n)),ram:pack(ram.subarray(0,n*2048)),initialRamSha256:createHash('sha256').update(initial).digest('hex'),ramSha256:createHash('sha256').update(ram.subarray(0,n*2048)).digest('hex')};
}
fs.writeFileSync(a.out,JSON.stringify({source:'Source SetPRout FF TimerControl; NMI decrements before GameRoutines, completion compares C4 grow/C8 injury/C0 fire and clears master timer after NMI. Every captured engine9/10/12 adjacent mode1/task3 pair, no skipped rows.',inputs:sources.length,frames,receipts,rows,completions,replay,diagnostics},null,2)+'\n');console.log(JSON.stringify({inputs:sources.length,frames,rows:rows.length,completions:completions.length,diagnostics:diagnostics.length}));

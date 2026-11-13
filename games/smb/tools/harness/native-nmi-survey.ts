/** Read-only CPU/NMI candidate survey over retained v2 and power-on mood RAM.
 * npx tsx tools/harness/native-nmi-survey.ts --traces DIR --corpus DIR --out FILE [--verify] [--reference-traces DIR]
 * A held FrameCounter is not assumed to be a lag frame: pause and RNG/OAM changes remain classified separately.
 * RAM cannot identify a suspended PC or work-cycle budget; replay candidates with a native CPU observer. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export function timingState(r:Uint8Array){
 return {counter:r[9],engine:r[14],mode:r[0x770],modeTask:r[0x772],pause:r[0x776],timer:r[0x747],parser:r[0x71f],scrollThirtyTwo:r[0x73d],camera:r[0x71a]*256+r[0x71c],column:r[0x725]*16+r[0x726],areaPointer:r[0xe7]+r[0xe8]*256,areaOffset:r[0x72c],areaObjectPage:r[0x72a],areaObjectLengths:Array.from(r.subarray(0x730,0x733)),enemyOffset:r[0x739],enemyFlags:Array.from(r.subarray(15,21)),enemyIds:Array.from(r.subarray(22,28)),vramControl:r[0x773],buffer1:r[0x300],buffer2:r[0x340],sprite0:r[0x722],screenDisable:r[0x774],random:Array.from(r.subarray(0x7a7,0x7ae))};
}
export function classifyTimingRow(p:Uint8Array,r:Uint8Array){
 if(p[0x770]!==1||r[0x770]!==1||p[0x772]!==3||r[0x772]!==3||p[14]!==8||r[14]!==8)return;
 const delta=(r[9]-p[9])&255;if(delta===1)return;
 const rngStable=p.subarray(0x7a7,0x7ae).every((b,i)=>b===r[0x7a7+i]),oamStable=p.subarray(0x200,0x300).every((b,i)=>b===r[0x200+i]),paused=Boolean((p[0x776]|r[0x776])&1);
 const kind=delta===0?(paused?'paused-hold':rngStable?'held-counter-and-rng':'held-counter-rng-changed'):`counter-delta-${delta}`;
 const changed=Array.from({length:2048},(_,address)=>address).filter(a=>p[a]!==r[a]);
 return {kind,delta,rngStable,oamStable,changed,before:timingState(p),after:timingState(r)};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'},verify:{type:'boolean',default:false},'reference-traces':{type:'string'}}});
 if(!a.out||!a.traces&&!a.corpus)throw Error('--out and at least one of --traces/--corpus required');
 const inputs:{kind:string;id:string;directory:string;frames?:number;ramSha256?:string;padSha256?:string}[]=[];
 if(a.traces)for(const level of fs.readdirSync(a.traces).sort())if(fs.existsSync(path.join(a.traces,level,'ram.bin')))inputs.push({kind:'v2',id:level,directory:path.join(a.traces,level),ramSha256:a['reference-traces']?sha(fs.readFileSync(path.join(a['reference-traces'],level,'ram.bin'))):undefined});
 if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')).sort()){
  const directory=path.join(a.corpus,'captures',id),receipt=JSON.parse(fs.readFileSync(path.join(directory,'capture.json'),'utf8'));
  inputs.push({kind:'mood',id,directory,frames:receipt.frames,ramSha256:receipt.ramSha256,padSha256:receipt.padSha256});
 }
 const events=[],counts:Record<string,number>={},receipts=[];let frames=0,normalRows=0;
 for(const [i,input]of inputs.entries()){
  const ram=fs.readFileSync(path.join(input.directory,'ram.bin')),initial=fs.readFileSync(path.join(input.directory,'initial.ram')),n=ram.length/2048;
  if(n!==Math.floor(n)||input.frames!==undefined&&n!==input.frames)throw Error(`Invalid frame count ${input.id}`);
  const digest=a.verify||!input.ramSha256?sha(ram):input.ramSha256;
  if(a.verify&&input.ramSha256&&digest!==input.ramSha256)throw Error(`RAM hash mismatch ${input.id}`);
  frames+=n;
  for(let row=0;row<n;row++){
   const p=row?ram.subarray((row-1)*2048,row*2048):initial,r=ram.subarray(row*2048,(row+1)*2048);
   if(p[0x770]===1&&r[0x770]===1&&p[0x772]===3&&r[0x772]===3&&p[14]===8&&r[14]===8)normalRows++;
   const event=classifyTimingRow(p,r);if(!event)continue;
   counts[event.kind]=(counts[event.kind]??0)+1;events.push({input:input.kind,id:input.id,row,level:`${r[0x75f]+1}-${r[0x75c]+1}`,...event});
  }
  receipts.push({input:input.kind,id:input.id,frames:n,ramSha256:digest,padSha256:input.padSha256});
  if(i%16===0)console.error(`${i+1}/${inputs.length} inputs, ${frames} PPU samples, ${events.length} non-unit clock rows`);
 }
 fs.writeFileSync(a.out,JSON.stringify({schema:'native-nmi-survey-v1',method:'All adjacent retained normal-play mode1/task3/engine8 RAM samples. Separate pause, RNG/OAM stability and counter deltas; no lag-frame rule is inferred from a level/row.',hashesVerified:a.verify,referenceTraces:a['reference-traces'],inputs:inputs.length,frames,normalRows,counts,events,receipts},null,2)+'\n');
 console.log(JSON.stringify({inputs:inputs.length,frames,normalRows,counts}));
}

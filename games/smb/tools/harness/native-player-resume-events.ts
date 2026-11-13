/** Native SetPRout state0 timelines, with optional input-only native CPU branches.
 * npx tsx tools/harness/native-player-resume-events.ts --traces DIR --corpus DIR --out JSON
 * --probe manifest.json --branches DIR --branch-capture SHA --rom FILE adds native-player-resume-probe.cpp branches. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
import controls from '../../data/native-area-controls.json';
const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'},probe:{type:'string'},branches:{type:'string'},'branch-capture':{type:'string'},rom:{type:'string'}}});if(!a.out)throw Error('--out required');
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64');
const sources:{kind:string;id:string;directory:string}[]=[];
if(a.traces)for(const id of fs.readdirSync(a.traces).sort())if(fs.existsSync(path.join(a.traces,id,'ram.bin')))sources.push({kind:'v2',id,directory:path.join(a.traces,id)});
if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')).sort())sources.push({kind:'mood',id,directory:path.join(a.corpus,'captures',id)});
const receipts=[],timelines:any[]=[],replays:any[]=[];let frames=0;
const sample=(r:Uint8Array)=>({frame:r[9],engine:r[14],timer:r[0x747],state:r[0x1d],x:r[0x6d]*256+r[0x86],xFraction:r[0x400],xSpeed:(r[0x57]<<24)>>24,xForce:r[0x705],y:r[0xce],yFraction:r[0x416],ySpeed:(r[0x9f]<<24)>>24,yForce:r[0x433],gravity:r[0x709],gravityDown:r[0x70a],currentAB:r[10],previousAB:r[13],savedPad:r[0x6fc],size:r[0x754],status:r[0x756]});
function entryFor(source:{directory:string},level:string,row:number){
 const root=path.join(source.directory,'entries');if(!fs.existsSync(root))throw Error('Native entry epochs required for replay');
 for(const entry of fs.readdirSync(root)){const receiptPath=path.join(root,entry,'receipts',level,'entrance.json');if(!fs.existsSync(receiptPath))continue;const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8')),directory=path.join(root,entry,'traces',level),pads=fs.readFileSync(path.join(directory,'pads.bin'));if(receipt.sourceFrameOffset<=row&&receipt.sourceFrameOffset+pads.length>row)return {entry,receipt,initial:fs.readFileSync(path.join(directory,'initial.ram'))};}
 throw Error(`No source epoch ${level} row${row}`);
}
function replay(source:{id:string;directory:string},level:string,pickup:number,ram:Uint8Array,pads:Uint8Array,branch:string,controller:number){
 const e=entryFor(source,level,pickup),from=e.receipt.sourceFrameOffset,bytes=ram.subarray(from*2048),buttons=pads.subarray(from);
 return {id:source.id,entry:e.entry,level,branch,frames:buttons.length,pickup:pickup-from,firstController:controller-from,sourceFrameOffset:from,receipt:e.receipt,initialRam:pack(e.initial),pads:pack(buttons),ram:pack(bytes),initialRamSha256:sha(e.initial),ramSha256:sha(bytes),padsSha256:sha(buttons)};
}
for(const source of sources){
 const bytes=fs.readFileSync(path.join(source.directory,'ram.bin')),initial=fs.readFileSync(path.join(source.directory,'initial.ram')),ramSha256=sha(bytes);frames+=bytes.length/2048;
 const capture=path.join(source.directory,'capture.json');if(fs.existsSync(capture)&&JSON.parse(fs.readFileSync(capture,'utf8')).ramSha256!==ramSha256)throw Error(`Changed native RAM ${source.id}`);receipts.push({input:source.kind,id:source.id,frames:bytes.length/2048,ramSha256});
 for(let row=0;row<bytes.length/2048;row++){
  const r=bytes.subarray(row*2048,(row+1)*2048),p=row?bytes.subarray((row-1)*2048,row*2048):initial;
  if(p[14]!==8||![9,12].includes(r[14])||r[0x747]!==255||r[0x770]!==1||r[0x772]!==3)continue;
  let finish=row;while(finish+1<bytes.length/2048&&bytes[finish*2048+14]!==8)finish++;if(bytes[finish*2048+14]!==8)throw Error('Truncated native transformation');const controller=finish+1,end=Math.min(controller+3,bytes.length/2048),level=`${r[0x75f]+1}-${r[0x75c]+1}`;
  timelines.push({input:source.kind,id:source.id,level,pickup:row,completion:finish,firstController:controller,rows:Array.from({length:end-row},(_,i)=>sample(bytes.subarray((row+i)*2048,(row+i+1)*2048)))});
  const pads=fs.readFileSync(path.join(source.directory,'pads.bin'));replays.push(replay(source,level,row,bytes.subarray(0,end*2048),pads.subarray(0,end),'recorded',controller));
 }
}
let observer;
if(a.probe){
 if(!a.branches||!a['branch-capture']||!a.rom)throw Error('branches/branch-capture/rom required');const romSha256=sha(fs.readFileSync(a.rom));if(romSha256!==controls.romSha256)throw Error('Authenticated PRG0 ROM required');
 const probe=JSON.parse(fs.readFileSync(a.probe,'utf8')),source=sources.find(s=>s.id===a['branch-capture']);if(!source)throw Error('Unknown branch capture');
 const original=fs.readFileSync(path.join(source.directory,'ram.bin')),pads=fs.readFileSync(path.join(source.directory,'pads.bin')),pickup=probe.pickup,last=probe.last,at=original.subarray(pickup*2048,(pickup+1)*2048),level=`${at[0x75f]+1}-${at[0x75c]+1}`;
 if(probe.verifiedBaselineRows!==last+1)throw Error('Native prefix not verified');
 for(const b of probe.branches){
  const root=path.join(a.branches,b.name),tail=fs.readFileSync(path.join(root,'ram.bin')),buttons=fs.readFileSync(path.join(root,'pads.bin'));
  if(tail.length!==(last-pickup+1)*2048||buttons.length!==last-pickup+1)throw Error('Branch length mismatch');
  if(b.name==='recorded'&&(!tail.equals(original.subarray(pickup*2048,(last+1)*2048))||!buttons.equals(pads.subarray(pickup,last+1))))throw Error('Recorded branch differs from authenticated original');
  const ram=Buffer.concat([original.subarray(0,pickup*2048),tail]),branchPads=Buffer.concat([pads.subarray(0,pickup),buttons]);replays.push(replay(source,level,pickup,ram,branchPads,b.name,b.firstControllerRow));
 }
 observer={...probe,romSha256,sourceSha256:sha(fs.readFileSync('tools/harness/native-player-resume-probe.cpp')),method:'Every baseline RAM sample through last validated against recorded native RAM; all branches restore the same CPU/PPU snapshot and change only controller input, never RAM or ROM.'};
}
fs.writeFileSync(a.out,JSON.stringify({source:'Native UpToFiery passesY0 toSetPRout (Player_State0); OnGroundStateSub omits vertical movement, BG selectsfallstate2; current/previousAB remain latched duringPlayerChangeSize. All native grow/fire starts, no level/frame runtime conditions.',inputs:sources.length,frames,receipts,timelines,observer,replays},null,2)+'\n');console.log(JSON.stringify({inputs:sources.length,frames,timelines:timelines.length,replays:replays.length,observer}));

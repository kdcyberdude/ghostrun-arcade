/** Source ProcHammerObj held motion and RunHSubs boxes from all native inputs.
 * npx tsx tools/harness/native-hammer-hold-events.ts --traces DIR --corpus DIR --out JSON */
import zlib from 'node:zlib';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import reference from '../../evidence/native-nmi-corpus-survey.json';
const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'}}});if(!a.out)throw Error('--out required');
const sources:{input:string;id:string;directory:string}[]=[];
if(a.traces)for(const id of fs.readdirSync(a.traces).sort()){const directory=path.join(a.traces,id);if(fs.existsSync(path.join(directory,'ram.bin')))sources.push({input:'v2',id,directory});}
if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')).sort())sources.push({input:'mood',id,directory:path.join(a.corpus,'captures',id)});
const signed=(v:number)=>v<<24>>24,box=(r:Uint8Array,s:number)=>Array.from(r.subarray(0x4d0+s*4,0x4d4+s*4));
const state=(r:Uint8Array,s:number)=>({state:r[0x2a+s],x:r[0x7a+s]*256+r[0x93+s]+r[0x40d+s]/256,y:(r[0xc2+s]-1)*256+r[0xdb+s],vx:signed(r[0x64+s])/16,speed:signed(r[0xac+s]),force:r[0x440+s],fraction:r[0x423+s],collision:Boolean(r[0x6be+s]),box:box(r,s)});
const pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64');
const events=new Map<string,any>(),receipts=[],diagnostics=[],passes=[];let frames=0,heldObjects=0,midLoopObjects=0,erased=0,rewritten=0;
for(const source of sources){
 const data=fs.readFileSync(path.join(source.directory,'ram.bin')),initial=fs.readFileSync(path.join(source.directory,'initial.ram')),hash=createHash('sha256').update(data).digest('hex'),receipt=reference.receipts.find(r=>r.input===source.input&&r.id===source.id);if(!receipt||receipt.ramSha256!==hash)throw Error(`Native RAM changed ${source.id}`);frames+=data.length/2048;receipts.push({input:source.input,id:source.id,frames:data.length/2048,ramSha256:hash});
 for(let row=0;row<data.length/2048;row++){
  const r=data.subarray(row*2048,(row+1)*2048),p=row?data.subarray((row-1)*2048,row*2048):initial;
  if(p[0x770]!==1||r[0x770]!==1||p[0x772]!==3||r[0x772]!==3||r[9]!==((p[9]+1)&255)||!r[0x747])continue;
  const fresh=Array.from({length:9},(_,s)=>s).filter(s=>!p[0x6be+s]&&r[0x6be+s]);
  const hurtSlot=!p[0x747]&&!r[0x79f]&&fresh.length?Math.max(...fresh):-1;
  if(!p[0x747]&&hurtSlot<0)continue;
  if(hurtSlot>=0)passes.push({input:source.input,id:source.id,row,hurtSlot,beforeRam:pack(p),afterRam:pack(r)});
  const last=Array.from({length:9},(_,s)=>s).find(s=>p[0x2a+s]||r[0x2a+s]);
  for(let slot=8;slot>=0;slot--){
   if(!(p[0x2a+slot]&128)||!p[0x747]&&slot>=hurtSlot)continue;
   if(r[0x2a+slot]&&!(r[0x2a+slot]&128)){rewritten++;continue;}
   const before=state(p,slot),after=state(r,slot),owner=r[0x6ae+slot],entry={slot,before,after,camera:r[0x71a]*256+r[0x71c],checkX:(slot<4?r:p)[0x76+slot]*256+(slot<4?r:p)[0x8f+slot],owner:{x:r[0x6e+owner]*256+r[0x87+owner],y:(r[0xb6+owner]-1)*256+r[0xcf+owner]+24,dir:r[0x46+owner]===1?1:-1,state:r[0x1e+owner]},offscreen:last===slot?r[0x3d6]:null};
   heldObjects++;if(hurtSlot>=0)midLoopObjects++;if(!after.state)erased++;
   const context={input:source.input,id:source.id,row,frame:r[9],beforeControl:p[0x747],afterControl:r[0x747],hurtSlot};
   if(['x','y','vx','speed','force','fraction','collision'].some(k=>before[k as keyof typeof before]!==after[k as keyof typeof after]))diagnostics.push({...context,...entry});
   const key=JSON.stringify(entry),found=events.get(key);if(found){found.count++;if(found.examples.length<2)found.examples.push(context);}else events.set(key,{...entry,count:1,examples:[context]});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Actual native ProcHammerObj calls with TimerControl already nonzero, or lower misc slots after a newly latched hammer contact raised it mid-loop. Native positions/motion bytes remain held; RunHSubs computes fresh offscreen bits and cached boxes. Every RAM input authenticated against prior full-corpus survey. Ownership rewritten as a coin is counted separately.',inputs:sources.length,frames,heldObjects,midLoopObjects,erased,rewritten,receipts,events:[...events.values()],passes,diagnostics})+'\n');console.log(JSON.stringify({inputs:sources.length,frames,heldObjects,midLoopObjects,erased,rewritten,events:events.size,passes:passes.length,diagnostics:diagnostics.length}));

/** Native actor transitions, preserving NMI timer and preceding player-dispatch order. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {nativeIntervalStep} from '../../src/native-interval.js';
import {runNativeStarFlag,runNativeFirework} from '../../src/native-star-flag.js';
const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'}}});
if(!a.out||!a.traces&&!a.corpus)throw Error('--out and trace input required');
const sources:{kind:string;id:string;directory:string}[]=[];
if(a.traces)for(const id of fs.readdirSync(a.traces).sort())if(fs.existsSync(path.join(a.traces,id,'ram.bin')))sources.push({kind:'v2',id,directory:path.join(a.traces,id)});
if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')).sort())sources.push({kind:'mood',id,directory:path.join(a.corpus,'captures',id)});
const digits=(r:Uint8Array)=>r[0x7f8]*100+r[0x7f9]*10+r[0x7fa];
const transitions=new Map<string,any>(),fireworkTransitions=new Map<string,any>(),receipts=[],diagnostics=[];let frames=0,rows=0;
for(const source of sources){
 const bytes=fs.readFileSync(path.join(source.directory,'ram.bin')),initial=fs.readFileSync(path.join(source.directory,'initial.ram')),ramSha256=createHash('sha256').update(bytes).digest('hex');frames+=bytes.length/2048;
 const capture=path.join(source.directory,'capture.json');if(fs.existsSync(capture)&&JSON.parse(fs.readFileSync(capture,'utf8')).ramSha256!==ramSha256)throw Error(`RAM hash changed ${source.id}`);
 receipts.push({kind:source.kind,id:source.id,frames:bytes.length/2048,ramSha256});
 for(let row=0;row<bytes.length/2048;row++){
  const r=bytes.subarray(row*2048,(row+1)*2048),p=row?bytes.subarray((row-1)*2048,row*2048):initial;
  if(r[0x770]!==1||r[0x772]!==3||r[0x7c6]&1||p[0x770]!==1||p[0x772]!==3||r[14]!==5)continue;
  for(let slot=0;slot<5;slot++){
   if(p[0xf+slot]===1&&p[0x16+slot]===22&&r[0x16+slot]===22){
    const before={timer:p[0xa0+slot],cell:p[0x58+slot],active:true},after={timer:r[0xa0+slot],cell:r[0x58+slot],active:r[0xf+slot]!==0},predicted={...before},score=runNativeFirework(predicted);
    const context={kind:source.kind,id:source.id,row,slot};if(JSON.stringify(predicted)!==JSON.stringify(after))diagnostics.push({...context,actor:22,before,after,predicted});
    const key=JSON.stringify({before,after,score});let t=fireworkTransitions.get(key);if(!t){t={before,after,score,count:0,examples:[]};fireworkTransitions.set(key,t);}t.count++;if(t.examples.length<2)t.examples.push(context);
   }
   if(p[0xf+slot]!==1||p[0x16+slot]!==49||r[0xf+slot]!==1||r[0x16+slot]!==49||p[0x746]>=5)continue;
   const n=nativeIntervalStep(p[0x77f],0,p[0x747]);
   const before={task:p[0x746],y:p[0xcf+slot],state:p[0x1e+slot],interval:Math.max(0,p[0x796+slot]-(n.tick?1:0))};
   // InitFireworks in a lower free slot runs before this actor and decrements the shared counter.
   let fireworks=p[0x6d7];for(let lower=0;lower<slot;lower++)if(!p[0xf+lower]&&r[0xf+lower]===1&&r[0x16+lower]===22)fireworks=(fireworks-1)&255;
   const input={time:digits(p),fireworks,music:r[0x7b1],endWalk:true,blocked:!(r[0x490]&1)};
   const after={task:r[0x746],y:r[0xcf+slot],state:r[0x1e+slot],interval:r[0x796+slot]},predicted={...before},result=runNativeStarFlag(predicted,input);
   const context={kind:source.kind,id:source.id,row,slot,level:`${r[0x75f]+1}-${r[0x75c]+1}`,counter:r[9],intervalControl:r[0x77f]};rows++;
   if(JSON.stringify(predicted)!==JSON.stringify(after)||result.time!==digits(r))diagnostics.push({...context,before,input,after,predicted,result,nativeTime:digits(r)});
   const key=JSON.stringify({before,input,after,time:digits(r)});let t=transitions.get(key);if(!t){t={before,input,after,time:digits(r),count:0,examples:[]};transitions.set(key,t);}t.count++;if(t.examples.length<2)t.examples.push(context);
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'PlayerEndLevel then RunStarFlagObj; native NMI interval decrement precedes actor pass. All retained ID49 end-walk adjacent rows, no fitted phase.',inputs:sources.length,frames,rows,receipts,transitions:[...transitions.values()],fireworkTransitions:[...fireworkTransitions.values()],diagnostics})+'\n');
console.log(JSON.stringify({inputs:sources.length,frames,rows,transitions:transitions.size,diagnostics:diagnostics.length}));

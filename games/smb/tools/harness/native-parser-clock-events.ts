/** Capture every eligible native GameEngine parser-clock transition, grouped by identical input/output.
 * npx tsx tools/harness/native-parser-clock-events.ts --traces DIR --out data/native-parser-clock.json
 * Inputs are independent of the resulting task: actual scroll is the ScreenLeft_X_Pos byte delta (loopbacks change pages
 * only), and buffer2 busy is the two horizontal length-2 blank-metatile commands emitted by RemoveCoin_Axe.
 * The parser's own buffer2 column/attribute packets have lengths $9a/$01 and are NOT pre-parser busy. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';

export function nativeParserVramBusy(r:Uint8Array){
 return r[0x773]===6&&r[0x341]!==0&&r[0x343]===2&&r[0x348]===2&&r[0x34b]===0;
}
export function parserClockEvent(previous:Uint8Array,current:Uint8Array){
 if(previous[0x770]!==1||current[0x770]!==1||previous[0x772]!==3||current[0x772]!==3||(current[0x776]&1))return;
 return {before:[previous[0x71f],previous[0x73d]],input:{scroll:(current[0x71c]-previous[0x71c])&255,busy:nativeParserVramBusy(current)},after:[current[0x71f],current[0x73d]]};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'data/native-parser-clock.json'}}});
 if(!a.traces)throw Error('--traces required');
 const events=new Map<string,{before:number[],input:{scroll:number,busy:boolean},after:number[],count:number,ppuFrames:number,example:{level:string,frame:number,lastFrame:number,controller:number,buffer2:number[]}}>(),levels:Record<string,number>={},windows:unknown[]=[],partialPasses:unknown[]=[];
 for(const level of fs.readdirSync(a.traces).filter(l=>/^\d-\d$/.test(l)).sort()){
  const dir=path.join(a.traces,level),bytes=fs.readFileSync(path.join(dir,'ram.bin'));let previous=new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram')));levels[level]=0;
  let pass:{previous:Uint8Array,last:Uint8Array,counter:number,first:number,samples:{frame:number,counter:number,task:number,scroll:number,cam:number,x:number}[]}|undefined;
  const flush=()=>{
   if(!pass)return;
   const event=parserClockEvent(pass.previous,pass.last)!;levels[level]++;
   const key=JSON.stringify(event),found=events.get(key);
   if(found){found.count++;found.ppuFrames+=pass.samples.length;}
   else events.set(key,{...event,count:1,ppuFrames:pass.samples.length,example:{level,frame:pass.first,lastFrame:pass.samples.at(-1)!.frame,controller:pass.last[0x773],buffer2:Array.from(pass.last.subarray(0x341,0x34c))}});
   if(pass.samples.length>1)partialPasses.push({level,...event,samples:pass.samples});
   pass=undefined;
  };
  for(let frame=0;frame<bytes.length/2048;frame++){
   const current=new Uint8Array(bytes.buffer,bytes.byteOffset+frame*2048,2048),event=parserClockEvent(previous,current);
   if(event){
    if(pass&&pass.counter!==current[9])flush();
    pass??={previous,last:current,counter:current[9],first:frame,samples:[]};pass.last=current;
    pass.samples.push({frame,counter:current[9],task:current[0x71f],scroll:current[0x73d],cam:current[0x71a]*256+current[0x71c],x:current[0x6d]*256+current[0x86]});
    if(level==='4-3'&&frame>=201&&frame<=205)windows.push({frame,...event,births:[0,1,2,3,4,5].filter(slot=>current[0xf+slot]&&!previous[0xf+slot]).map(slot=>({slot,id:current[0x16+slot],x:current[0x6e+slot]*256+current[0x87+slot]}))});
   }else flush();
   previous=current;
  }
  flush();
 }

 fs.writeFileSync(a.out,JSON.stringify({schema:'native-parser-clock-events-v1',source:'All native v2 GameEngine transitions (mode1 task3 before/after, not paused). Inputs: camera low-byte delta and independent RemoveCoin_Axe buffer2 packet; outputs: $071f/$073d. Initial RAM included. Consecutive PPU samples with the same native FrameCounter are one completed GameEngine pass; partial samples remain explicit. No output-state inference used to choose busy.',levels,events:[...events.values()],windows,partialPasses})+'\n');
 console.log(`Wrote ${[...events.values()].reduce((n,e)=>n+e.count,0)} transitions in ${events.size} groups across ${Object.keys(levels).length} levels`);
}

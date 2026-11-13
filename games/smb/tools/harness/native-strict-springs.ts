/** Retain raw ID50 slot rows, including birth and erasure, from authenticated native traces. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw new Error('--traces DIR --out FILE required');
const events:(string|number)[][]=[],sources:{level:string,ramSha256:string,padSha256:string,initialSha256:string,frames:number}[]=[];
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
for(let n=0;n<32;n++){
 const level=`${Math.floor(n/4)+1}-${n%4+1}`,dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),initial=fs.readFileSync(path.join(dir,'initial.ram'));if(ram.length!==pads.length*2048)throw new Error(`${level}: unpaired input/RAM`);
 let found=false,previous=initial;
 for(let frame=0;frame<pads.length;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048);
  for(let slot=0;slot<6;slot++)if(r[15+slot]&&r[22+slot]===50||previous[15+slot]&&previous[22+slot]===50){events.push([level,frame,slot,...[15,22,135,110,207,182,30,88].map(a=>r[a+slot])]);found=true;}
  previous=r;
 }
 if(found)sources.push({level,ramSha256:hash(ram),padSha256:hash(pads),initialSha256:hash(initial),frames:pads.length});
}
fs.writeFileSync(a.out,JSON.stringify({schema:'native-strict-spring-v1',source:'Jumpspring stores X/Y/FixedY and YHigh1; JumpspringHandler adds [8,16,8,0] to FixedY during compression; Enemy_State is retained and unowned.',columns:['level','frame','slot','flag','id','xLow','xPage','yLow','yPage','state','fixedY'],sources,events}).replace(/\],\[/g,'],\n[')+'\n');console.log(`${events.length} raw rows from ${sources.length} inputs`);

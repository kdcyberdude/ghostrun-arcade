/** Raw native InitFlyingCheepCheep retained fractions and observed rejected-slot SmallBBox writes. */
import fs from 'node:fs';import zlib from 'node:zlib';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');const births=[],rejected=[];
const state=(r,s)=>({speed:(r[0xa0+s]<<24)>>24,force:r[0x434+s],fraction:r[0x417+s]});
for(const level of fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin'));let p=fs.readFileSync(path.join(dir,'initial.ram'));
 for(let frame=0;frame<ram.length/2048;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048);
  if(r[0x770]===1&&r[0x772]===3)for(let slot=0;slot<5;slot++){
   if(!p[15+slot]&&r[15+slot]===1&&r[22+slot]===20)births.push({level,frame,slot,before:state(p,slot),after:state(r,slot),y:r[0xcf+slot]});
   if(!p[15+slot]&&!r[15+slot]&&r[22+slot]===20&&r[0x6cb]===20&&slot>=3+Number(Boolean(r[0x6cc]))&&p[0x78f]<=1&&[16,96,32,72].includes(r[0x78f])&&(p[0xa0+slot]||p[0x434+slot])&&!r[0xa0+slot]&&!r[0x434+slot])rejected.push({level,frame,slot,before:state(p,slot),after:state(r,slot),hard:r[0x6cc],timer:r[0x78f]});
  }
  p=r;
 }
}
const windows=[];
for(const birth of births){const bytes=fs.readFileSync(path.join(a.traces,birth.level,'ram.bin')),rows=[];for(let frame=birth.frame;frame<bytes.length/2048;frame++){
 const r=bytes.subarray(frame*2048,(frame+1)*2048),s=birth.slot;if(r[0x770]!==1||r[0x772]!==3||r[15+s]!==1||r[22+s]!==20||r[30+s]!==0)break;
 rows.push([frame,(r[0x6e+s]*256+r[0x87+s])*256+r[0x401+s],(r[0xb6+s]-1)*256+r[0xcf+s],(r[0xa0+s]<<24)>>24,r[0x434+s],r[0x417+s],r[0x747]]);
 }windows.push({level:birth.level,slot:birth.slot,born:birth.frame,rows});}
fs.writeFileSync(a.out,JSON.stringify({source:'Original32 native PRG0 RAM. Every new flagged ID20 is retained. Rejected cases select observable SmallBBox A0/0434→0 writes on a fresh frenzy timer with slot above the native SecondaryHardMode limit; unchanged rejected calls are not claimed.',births,rejected,windowRows:windows.reduce((n,w)=>n+w.rows.length,0),gzipBase64:zlib.gzipSync(JSON.stringify(windows),{level:9}).toString('base64')})+'\n');console.log({births:births.length,nonzeroFraction:births.filter(b=>b.before.fraction).length,rejected:rejected.length});

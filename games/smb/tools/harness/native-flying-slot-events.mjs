/** Raw native InitFlyingCheepCheep retained fractions and observed rejected-slot SmallBBox writes. */
import {createHash} from 'node:crypto';import fs from 'node:fs';import zlib from 'node:zlib';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'},levels:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');const births=[],rejected=[],captures={},checkpoints=[];
const state=(r,s)=>({speed:(r[0xa0+s]<<24)>>24,force:r[0x434+s],fraction:r[0x417+s]});
const context=(r,s)=>({random:Array.from(r.subarray(0x7a7,0x7ae)),counter:r[9],playerX:r[0x6d]*256+r[0x86],playerSpeed:((r[0x57]<<24)>>24)*256+r[0x705],hard:Boolean(r[0x6cc]),sub:r[0x401+s],x256:(r[0x6e+s]*256+r[0x87+s])*256+r[0x401+s],vx:((r[0x58+s]<<24)>>24)/16,wait:r[0x78f]});
for(const level of a.levels?.split(',')??fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin'));let p=fs.readFileSync(path.join(dir,'initial.ram'));captures[level]={ramSha256:createHash('sha256').update(ram).digest('hex'),padsSha256:createHash('sha256').update(fs.readFileSync(path.join(dir,'pads.bin'))).digest('hex')};
 for(let frame=0;frame<ram.length/2048;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048);
  if((level==='2-3'?[1196,1197,1198,1199]:level==='7-3'?[456,457,458,577,578,579]:[]).includes(frame))checkpoints.push({level,frame,timer:r[0x78f],buffer:r[0x6cb],fish:Array.from({length:5},(_,slot)=>slot).filter(slot=>r[15+slot]&&r[22+slot]===20).map(slot=>[slot,(r[0x6e+slot]*256+r[0x87+slot])*256+r[0x401+slot],(r[0xb6+slot]-1)*256+r[0xcf+slot],...Object.values(state(r,slot))])});
  if(r[0x770]===1&&r[0x772]===3)for(let slot=0;slot<5;slot++){
   if(!p[15+slot]&&r[15+slot]===1&&r[22+slot]===20)births.push({level,frame,slot,before:state(p,slot),after:state(r,slot),y:r[0xcf+slot],context:context(r,slot)});
   if(!p[15+slot]&&!r[15+slot]&&r[22+slot]===20&&r[0x6cb]===20&&slot>=3+Number(Boolean(r[0x6cc]))&&p[0x78f]<=1&&[16,96,32,72].includes(r[0x78f])&&(p[0xa0+slot]||p[0x434+slot])&&!r[0xa0+slot]&&!r[0x434+slot])rejected.push({level,frame,slot,before:state(p,slot),after:state(r,slot),hard:r[0x6cc],timer:r[0x78f],context:context(r,slot)});
  }
  p=r;
 }
}
const windows=[];
for(const birth of births){const bytes=fs.readFileSync(path.join(a.traces,birth.level,'ram.bin')),rows=[];for(let frame=birth.frame;frame<bytes.length/2048;frame++){
 const r=bytes.subarray(frame*2048,(frame+1)*2048),s=birth.slot;if(r[0x770]!==1||r[0x772]!==3||r[15+s]!==1||r[22+s]!==20||r[30+s]!==0)break;
 rows.push([frame,(r[0x6e+s]*256+r[0x87+s])*256+r[0x401+s],(r[0xb6+s]-1)*256+r[0xcf+s],(r[0xa0+s]<<24)>>24,r[0x434+s],r[0x417+s],r[0x747]]);
 }windows.push({level:birth.level,slot:birth.slot,born:birth.frame,rows});}
fs.writeFileSync(a.out,JSON.stringify({source:'Original32 native PRG0 RAM. Every new flagged ID20 is retained. Rejected cases select observable SmallBBox A0/0434→0 writes on a fresh frenzy timer with slot above the native SecondaryHardMode limit; unchanged rejected calls are not claimed.',captures,checkpoints,births,rejected,windowRows:windows.reduce((n,w)=>n+w.rows.length,0),gzipBase64:zlib.gzipSync(JSON.stringify(windows),{level:9}).toString('base64')})+'\n');console.log({births:births.length,nonzeroFraction:births.filter(b=>b.before.fraction).length,rejected:rejected.length});

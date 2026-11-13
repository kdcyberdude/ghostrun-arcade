/** Native CoinBlock/SBC carry and retained misc gravity bytes, from all head-bump events.
 * npx tsx tools/harness/native-coin-block-events.ts --traces DIR --corpus DIR --out JSON
 * Normal CoinBlock and CheckTopOfBlock/SetupJumpCoin have distinct carry sources. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'}}});
if(!a.out||!a.traces&&!a.corpus)throw Error('--out and at least one trace source required');
const sources:{kind:string;id:string;directory:string}[]=[];
if(a.traces)for(const id of fs.readdirSync(a.traces))if(fs.existsSync(path.join(a.traces,id,'ram.bin')))sources.push({kind:'v2',id,directory:path.join(a.traces,id)});
if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')))sources.push({kind:'mood',id,directory:path.join(a.corpus,'captures',id)});
const events=[],diagnostics=[],receipts=[];let frames=0;
const slot=(busy:Set<number>)=>[8,7,6].find(s=>!busy.has(s))??8;
for(const source of sources){
 const bytes=fs.readFileSync(path.join(source.directory,'ram.bin')),initial=fs.readFileSync(path.join(source.directory,'initial.ram'));frames+=bytes.length/2048;
 const ramSha256=createHash('sha256').update(bytes).digest('hex');
 const receipt=path.join(source.directory,'capture.json');if(fs.existsSync(receipt)&&JSON.parse(fs.readFileSync(receipt,'utf8')).ramSha256!==ramSha256)throw Error(`Native RAM digest changed ${source.id}`);
 receipts.push({input:source.kind,id:source.id,frames:bytes.length/2048,ramSha256});
 for(let row=0;row<bytes.length/2048;row++){
  const r=bytes.subarray(row*2048,(row+1)*2048),p=row?bytes.subarray((row-1)*2048,row*2048):initial;
  if(r[0x770]!==1||r[0x772]!==3||r[14]!==8||p[14]!==8||r[0x747]||p[0x747]||r[0x3ee]===p[0x3ee]||r[9]!==((p[9]+1)&255))continue;
  const block=p[0x3ee],bufferLow=r[0x3e6+block],bufferRow=r[0x3e4+block],metatile=p[0x500+bufferLow+bufferRow];
  if(![0xc0,0x5f,0x58,0x5d].includes(metatile))continue;
  const busy=new Set(Array.from({length:9},(_,s)=>s).filter(s=>p[0x2a+s]));
  const above=bufferRow>=16&&p[0x500+bufferLow+bufferRow-16]===0xc2;if(above)busy.add(slot(busy));
  const s=slot(busy),blockX=r[0x76+block]*256+r[0x8f+block],blockY=(r[0xd7+block]+2)&255;
  const e={input:source.kind,id:source.id,level:`${r[0x75f]+1}-${r[0x75c]+1}`,row,frame:r[9],block,metatile,above,busy:[...busy],slot:s,blockX,blockY,marioX:r[0x6d]*256+r[0x86],marioY:r[0xce],size:r[0x754]===1?0:1,duck:Boolean(r[0x714]),camera:r[0x71a]*256+r[0x71c],scroll:r[0x775],before:{force:p[0x440+s],fraction:p[0x423+s]},after:{x:r[0x7a+s]*256+r[0x93+s],y:(r[0xc2+s]-1)*256+r[0xdb+s],state:r[0x2a+s],speed:(r[0xac+s]<<24)>>24,force:r[0x440+s],fraction:r[0x423+s]}};
  if(e.after.state!==1||e.after.x!==(blockX|5))diagnostics.push(e);else events.push(e);
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'All source CoinBlock head-bump events: original block metatile C0/5F/58/5D, observed native block sprite before its first -2 bounce, FindEmptyMiscSlot busy bank including an earlier above-block coin, retained misc force/fraction and first gravity output.',inputs:sources.length,frames,receipts,events,diagnostics}).replace(/\{"input"/g,'\n{"input"')+'\n');
console.log(JSON.stringify({inputs:sources.length,frames,events:events.length,diagnostics:diagnostics.length,slots:events.reduce((m,e)=>(m[e.slot]=(m[e.slot]??0)+1,m),{} as Record<string,number>),blockYFormulaMismatches:events.filter(e=>e.blockY!==((e.marioY+(e.size===0||e.duck?18:4))&240)).length,blockXFormulaMismatches:events.filter(e=>e.blockX!==(e.marioX+8&~15)).length}));

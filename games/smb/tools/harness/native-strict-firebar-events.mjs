/** Native firebar readout fixtures, retaining genuine RAM/OAM from all eight castle inputs.
 * --traces DIR --observations CPU_JSONL_DIR --out FILE */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},observations:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.observations||!a.out)throw Error('--traces --observations --out required');
const hash=b=>createHash('sha256').update(b).digest('hex'),samples=[],levels=[],pivots=[];
const actors=r=>{const out=[];for(let slot=0;slot<6;slot++){
 const flag=r[15+slot],id=r[22+slot],owner=flag&127;if(!flag)continue;const x=r[110+slot]*256+r[135+slot],y=(r[182+slot]-1)*256+r[207+slot];
 if(flag&128){if(owner<6&&r[15+owner]&&!(r[15+owner]&128)&&r[22+owner]>=27&&r[22+owner]<=34)out.push({slot,kind:'firebar-alias',x,y,owner});}
 else if(id>=27&&id<=34)out.push({slot,kind:'firebar',x,y,state:r[30+slot],firebar:{id,high:r[160+slot],low:r[88+slot],speed:r[0x388+slot],direction:r[0x34+slot]}});
 }return out;};
for(let world=1;world<=8;world++){
 const level=`${world}-4`,dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin')),seen=new Set();let activeFrames=0;
 for(let frame=0;frame<ram.length/2048;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048),objects=actors(r);let retain=frame===0;if(objects.length)activeFrames++;
  for(const n of objects){const key=JSON.stringify([n.slot,n.kind,n.firebar?.id,n.firebar?.high,n.firebar?.low===0,n.firebar?.speed,n.firebar?.direction,n.state,Boolean(r[0x747]),r[0x770],r[0x772],r[14],n.owner]);if(!seen.has(key)){seen.add(key);retain=true;}}
  if(retain)samples.push({level,frame,actors:objects,ram:r.toString('base64')});
 }
 const file=path.join(a.observations,`${level}.jsonl.firebars.jsonl`),calls=fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
 // A visible executed pivot is a separate coordinate-contract check, not a
 // claim that every radial sprite or displayed pixel is compared by this adapter.
 const call=calls.find(c=>c.frame===c.endFrame&&!(c.offscreen&8)&&c.x-c.camera>=32&&c.x-c.camera<=192&&c.y>=32&&c.y<=208);
 if(call){const r=ram.subarray(call.frame*2048,(call.frame+1)*2048),offset=r[0x6e5+call.slot],quad=Array.from(r.subarray(0x200+offset,0x204+offset));
  if(quad[0]!==call.y||quad[3]!==call.x-call.camera||![100,101].includes(quad[1]))throw Error(`${level} native pivot/OAM contract differs`);
  pivots.push({level,frame:call.frame,slot:call.slot,x:call.x,y:call.y,camera:call.camera,offset,quad});
 }
 levels.push({level,frames:ram.length/2048,activeFrames,procCalls:calls.length,ramSha256:hash(ram),padsSha256:hash(fs.readFileSync(path.join(dir,'pads.bin')))});
}
fs.writeFileSync(a.out,JSON.stringify({source:'Original v2 authenticated native RAM, including CPU shadow OAM $0200..02FF; raw firebar/alias fields only. All eight inputs retained; zero active examples in7-4/8-4 are explicitly reported. ProcFirebar observation replay independently verified every completed PPU RAM row.',levels,pivots,samples:samples.length,gzipBase64:zlib.gzipSync(JSON.stringify(samples),{level:9}).toString('base64')})+'\n');console.log({samples:samples.length,pivots:pivots.length,levels});

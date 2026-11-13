/** Native powerup PlayerEnemyCollision decisions and following floatey awards.
 * npx tsx tools/harness/native-powerup-contact-events.ts --traces DIR --corpus DIR --out JSON */
import zlib from 'node:zlib';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
import {nativePowerupContact} from '../../src/native-powerup.js';
import type {NativeBox} from '../../src/native-misc.js';
const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'},'replay-entry':{type:'string'},'replay-level':{type:'string'},'replay-frames':{type:'string'}}});if(!a.out)throw Error('--out required');
const inputs:{kind:string;id:string;directory:string}[]=[];
if(a.traces)for(const id of fs.readdirSync(a.traces).sort())if(fs.existsSync(path.join(a.traces,id,'ram.bin')))inputs.push({kind:'v2',id,directory:path.join(a.traces,id)});
if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')).sort())inputs.push({kind:'mood',id,directory:path.join(a.corpus,'captures',id)});
const receipts=[],events=new Map<string,any>(),pickups=[],diagnostics=[];let frames=0,rows=0;const kinds:Record<number,number>={};
const digits=(r:Uint8Array)=>Array.from(r.subarray(0x7dd,0x7e3)).reduce((v,b)=>v*10+b,0)*10;
for(const input of inputs){
 const bytes=fs.readFileSync(path.join(input.directory,'ram.bin')),initial=fs.readFileSync(path.join(input.directory,'initial.ram')),ramSha256=createHash('sha256').update(bytes).digest('hex');frames+=bytes.length/2048;
 const capture=path.join(input.directory,'capture.json');if(fs.existsSync(capture)&&JSON.parse(fs.readFileSync(capture,'utf8')).ramSha256!==ramSha256)throw Error(`Changed RAM ${input.id}`);receipts.push({input:input.kind,id:input.id,frames:bytes.length/2048,ramSha256});
 for(let row=0;row<bytes.length/2048;row++){
  const r=bytes.subarray(row*2048,(row+1)*2048),p=row?bytes.subarray((row-1)*2048,row*2048):initial;
  if(p[0x770]!==1||r[0x770]!==1||p[0x772]!==3||r[0x772]!==3||!p[0x14]||p[0x1b]!==46||p[0x23]<6)continue;
  const pickup=!r[0x14]&&[6,11].includes(r[0x115])&&r[0x131]===47;
  if(!pickup&&(!r[0x14]||r[0x1b]!==46||r[14]!==8))continue;
  const player=Array.from(r.subarray(0x4ac,0x4b0)) as NativeBox,playerY=(r[0xb5]-1)*256+r[0xce],x=r[0x73]*256+r[0x8c],y=(r[0xbb]-1)*256+r[0xd4],camera=r[0x71a]*256+r[0x71c],frame=r[9],predicted=nativePowerupContact(x,y,camera,frame,playerY,player),context={input:input.kind,id:input.id,row,level:`${r[0x75f]+1}-${r[0x75c]+1}`,kind:r[0x39],engine:r[14]};rows++;
  const event={x,y,camera,frame:frame&1,playerY,player,pickup},key=JSON.stringify(event);let e=events.get(key);if(!e){e={...event,count:0,examples:[]};events.set(key,e);}e.count++;if(e.examples.length<2)e.examples.push(context);
  if(predicted!==pickup)diagnostics.push({...context,...event,predicted,enemyBox:Array.from(r.subarray(0x4c4,0x4c8))});
  if(pickup){kinds[r[0x39]]=(kinds[r[0x39]]??0)+1;const tail=Array.from({length:6},(_,i)=>bytes.subarray((row+i)*2048,(row+i+1)*2048));pickups.push({...context,x,y,player,award:tail.map(t=>({score:digits(t),lives:t[0x75a],control:t[0x115],timer:t[0x131]}))});}
 }
}
let replay;
if(a['replay-entry']){
 const entry=a['replay-entry'],level=a['replay-level'];if(!level||!a['replay-frames'])throw Error('replay level/frames required');
 const directory=path.join(entry,'traces',level),receipt=JSON.parse(fs.readFileSync(path.join(entry,'receipts',level,'entrance.json'),'utf8')),initial=fs.readFileSync(path.join(directory,'initial.ram')),pads=fs.readFileSync(path.join(directory,'pads.bin')),ram=fs.readFileSync(path.join(directory,'ram.bin')),n=Number(a['replay-frames']),pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64');
 if(!Number.isInteger(n)||n<1||n>pads.length||n*2048>ram.length)throw Error('Invalid replay frames');
 replay={capture:path.basename(path.dirname(path.dirname(entry))),entry:path.basename(entry),level,frames:n,receipt,initialRam:pack(initial),pads:pack(pads.subarray(0,n)),ram:pack(ram.subarray(0,n*2048)),initialRamSha256:createHash('sha256').update(initial).digest('hex'),ramSha256:createHash('sha256').update(ram.subarray(0,n*2048)).digest('hex')};
}
fs.writeFileSync(a.out,JSON.stringify({replay,source:'Native slot5/id46 active PlayerEnemyCollision rows and erased objects marked by fresh FloateyNum_Control6/11, Timer47. Source even-frame guard, cached player box, BoundBoxCtrlData3 and CheckPlayerVertical; no fitted contact rectangles.',eventColumns:['x','y','camera','frameParity','playerY','playerLeft','playerTop','playerRight','playerBottom','pickup','count'],inputs:inputs.length,frames,rows,kinds,receipts,events:[...events.values()].map(e=>[e.x,e.y,e.camera,e.frame,e.playerY,...e.player,e.pickup?1:0,e.count]),pickups,diagnostics}).replace(/\],\[/g,'],\n[')+'\n');console.log(JSON.stringify({inputs:inputs.length,frames,rows,events:events.size,pickups:pickups.length,kinds,diagnostics:diagnostics.length}));

/** Aggregate raw native water horizontal transitions, without importing the remake.
 * node tools/harness/native-water-horizontal-cases.mjs --traces DIR --moods DIR [--out FILE]
 * Collision/screen byte resets are later source routines; those rows verify the
 * retained force plus facing/moving/absolute/running/friction, not a pre-BG byte. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},moods:{type:'string'},out:{type:'string',default:'tests/fixtures/native-water-horizontal-cases.json'}}});
if(!a.traces||!a.moods)throw Error('--traces and --moods required');
const cases=new Map(),sources=[],signed=n=>n<128?n:n-256;
let transitions=0,bodyResets=0;
function scan(name,ram,pads,from,to,initial){
 const source=sources.push(name)-1;
 for(let frame=from;frame<to;frame++){
  const q=frame?ram.subarray((frame-1)*2048,frame*2048):initial,n=ram.subarray(frame*2048,(frame+1)*2048);
  if(!q||q[14]!==8||n[14]!==8||q[0x74e]||n[0x74e]||q[0x770]!==1||n[0x770]!==1||q[0x772]!==3||n[0x772]!==3||q[9]===n[9])continue;
  const buttons=q[0xb5]===1&&q[0xce]<208?pads[frame]:0,grounded=q[0x1d]===0;
  const stroke=Boolean((buttons&1)&&!(q[13]&128)&&(grounded||q[0x782]>1||q[0x9f]<128));
  const reset=n[0x57]===0?(n[0x785]===16?'background':n[0x3d0]&9?'screen':null):null;
  const input=[signed(q[0x57])*256+q[0x705],q[0x33],q[0x45],q[0x700],q[0x490],q[0x703],grounded,buttons,stroke];
  const expected=[signed(n[0x57])*256+n[0x705],n[0x33],n[0x45],n[0x700],n[0x703],n[0x701]*256+n[0x702]];
  const key=JSON.stringify([input,expected,reset]),existing=cases.get(key);
  if(existing)existing.count++;else cases.set(key,{input,expected,reset,source,frame,count:1});
  transitions++;if(reset)bodyResets++;
 }
}
for(const level of fs.readdirSync(a.traces).filter(n=>/^\d-\d$/.test(n)).sort()){
 const dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
 scan(`v2/${level}`,ram,pads,0,pads.length,fs.readFileSync(path.join(dir,'initial.ram')));
}
const inventory=JSON.parse(fs.readFileSync(path.join(a.moods,'water-epoch-inventory-29b5de7.json'))).filter(e=>e.area==='area-2'),groups=new Map();
for(const e of inventory)groups.set(e.sha256,[...(groups.get(e.sha256)??[]),e]);
for(const [sha,entries]of groups){
 const dir=path.join(a.moods,'captures',sha),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),audit=JSON.parse(fs.readFileSync(path.join(dir,'audit.json')));
 for(const e of entries){const entry=audit.entries[e.index];scan(`${sha}/epoch${e.index}`,ram,pads,entry.nativeEntryFrame+1,entry.endFrame);}
}
fs.writeFileSync(a.out,JSON.stringify({transitions,bodyResets,sources,cases:[...cases.values()]})+'\n');
console.log({transitions,bodyResets,cases:cases.size});

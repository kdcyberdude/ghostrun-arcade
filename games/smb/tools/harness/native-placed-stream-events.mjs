/** Retain every source cursor row and first-engine checkpoint bank initialization. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {decodeEntrance} from './native-entrance.mjs';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},out:{type:'string',default:'tests/fixtures/native-placed-stream-runtime.json'}}});if(!a.traces||!a.entrances)throw Error('--traces, --entrances required');
const runs=[];
for(const level of ['1-3','5-3']){
 const dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),entrance=decodeEntrance(fs.readFileSync(path.join(dir,'initial.ram')),JSON.parse(fs.readFileSync(path.join(a.entrances,level,'entrance.json'),'utf8'))),cursor=[],banks=[];
 for(let frame=0;frame<pads.length;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048);if(`${r[0x75f]+1}-${r[0x75c]+1}`!==level||r[0x770]!==1)break;
  cursor.push([r[0x739],r[0x73a],r[0x73b]]);
  if(level==='5-3'&&frame>=1023&&frame<=1030)banks.push({frame,engine:r[14],flags:Array.from(r.subarray(15,20)),ids:Array.from(r.subarray(22,27)),actors:Array.from({length:5},(_,slot)=>({slot,x:r[0x6e+slot]*256+r[0x87+slot],y:(r[0xb6+slot]-1)*256+r[0xcf+slot]}))});
 }
 runs.push({level,entrance,pads:Array.from(pads.subarray(0,cursor.length)),cursor,banks});
}
fs.writeFileSync(a.out,JSON.stringify({source:'Original v2 unreset physical TreeMushroom1 enemy stream rows; complete source0739/73a/73b, actual engine7/8 checkpoint bank flags/IDs/positions',runs})+'\n');console.log(runs.map(r=>[r.level,r.cursor.length]));

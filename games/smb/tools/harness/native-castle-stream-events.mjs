/** Every live GameMode/VictoryMode source cursor row, with explicit native control ownership. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {decodeEntrance} from './native-entrance.mjs';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},out:{type:'string',default:'tests/fixtures/native-castle-stream-runtime.json'}}});if(!a.traces||!a.entrances)throw Error('--traces and --entrances required');
const runs=[];
for(const level of ['1-4','2-4','3-4','4-4','5-4','6-4']){
 const directory=path.join(a.traces,level),ram=fs.readFileSync(path.join(directory,'ram.bin')),pads=fs.readFileSync(path.join(directory,'pads.bin')),entrance=decodeEntrance(fs.readFileSync(path.join(directory,'initial.ram')),JSON.parse(fs.readFileSync(path.join(a.entrances,level,'entrance.json'),'utf8'))),rows=[],banks=[];
 for(let frame=0;frame<pads.length;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048);if(`${r[0x75f]+1}-${r[0x75c]+1}`!==level||![1,2].includes(r[0x770]))break;
  rows.push([r[0x739],r[0x73a],r[0x73b]]);
  const p=frame?ram.subarray((frame-1)*2048,frame*2048):undefined;
  if(!p||r[14]!==p[14]||r[0x772]!==p[0x772]||r.slice(15,21).some((flag,slot)=>flag!==p[15+slot]))banks.push({frame,slots:Array.from({length:6},(_,slot)=>[r[15+slot],r[22+slot],r[110+slot]*256+r[135+slot],r[182+slot]*256+r[207+slot],r[30+slot],r[160+slot],r[88+slot],r[1025+slot],r[1076+slot],r[1047+slot],r[1942+slot]])});
 }
 runs.push({level,entrance,pads:Array.from(pads.subarray(0,rows.length)),rows,banks});
}
fs.writeFileSync(a.out,JSON.stringify({source:'Unmodified recorded v2 native PPU RAM, every GameMode/VictoryMode source EnemyData cursor row until native level/control ownership changes',runs})+'\n');console.log(runs.map(r=>[r.level,r.rows.length]));

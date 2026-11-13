/** Decode placed Lakitu records from native EnemyData, binding through the existing area atlas.
 * npx tsx tools/harness/native-lakitu-data.ts --rom FILE --traces DIR [--out data/native-lakitu.json] */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
import {nativeEnemyStream} from '../native-enemy-stream.mjs';import {observedLevels} from '../../src/levels.js';import {reconstruct,matchVisits} from './native-level-map.js';import controls from '../../data/native-area-controls.json';
const {values:a}=parseArgs({options:{rom:{type:'string'},traces:{type:'string'},out:{type:'string',default:'data/native-lakitu.json'}}});if(!a.rom||!a.traces)throw Error('--rom and --traces required');
const rom=fs.readFileSync(a.rom),romSha256=createHash('sha256').update(rom).digest('hex');if(romSha256!==controls.romSha256)throw Error('Authenticated PRG0 ROM required');
const streams:{pointer:number;bytes:number[]}[]=[];
const levels:{level:string;area:string;x:number;y:number;pointer:number;offset:number;bytes:number[];stopFrenzyX:number}[]=[];
for(const level of observedLevels()){
 const ram=new Uint8Array(fs.readFileSync(path.join(a.traces,level.id,'ram.bin'))),raw=reconstruct(ram,level.id),matches=matchVisits(level,raw.visits);
 for(let i=0;i<raw.visits.length;i++){
  const frame=raw.visits[i].frame*2048,pointer=ram[frame+0xe9]+ram[frame+0xea]*256,{area,offset}=matches[i],start=16+pointer-0x8000;
  const objects=nativeEnemyStream(rom.subarray(start,start+256),true).filter((o:{id:number})=>o.id===17);
  if(objects.length&&!streams.some(s=>s.pointer===pointer)){let end=0;while(end<256&&rom[start+end]!==255)end+=(rom[start+end]&15)===14?3:2;streams.push({pointer,bytes:Array.from(rom.subarray(start,start+end+1))});}
  for(const object of objects){
   const x=object.x+offset*16;if(levels.some(e=>e.level===level.id&&e.area===area&&e.x===x))continue;
   const stop=controls.areas.find(a=>a.level===level.id&&a.area===area)?.commands.find(c=>c.id===24);if(!stop)throw Error(`Missing source EndFrenzy ${level.id}/${area}`);
   const bytes=Array.from(rom.subarray(start+object.offset,start+object.offset+2));if(bytes[1]&64)throw Error('Hard-only Lakitu needs a native hard-mode predicate');
   levels.push({level:level.id,area,x,y:object.y,pointer,offset:object.offset,bytes,stopFrenzyX:stop.x});
  }
 }
}
fs.writeFileSync(a.out!,JSON.stringify({romSha256,evidence:'Native ProcessEnemyData/InitLakitu ROM id17 records, decoded page/row/offset from EnemyData pointers and bound through native block-buffer area geometry. EndFrenzy columns come from the independently decoded native area controls. Source coordinates and stream order, never measured spawn camera/frame thresholds.',streams,levels},null,2)+'\n');console.log(JSON.stringify(levels));

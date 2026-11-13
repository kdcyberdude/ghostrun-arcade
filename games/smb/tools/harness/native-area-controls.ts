/** Decode native ROM row-$0D control objects and bind their columns to remake areas through the existing native block-buffer geometry match.
 * npx tsx tools/harness/native-area-controls.ts --rom game.nes --traces DIR [--out data/native-area-controls.json]
 * Object positions are ROM level data, never measured camera thresholds or replay frame numbers. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {observedLevels} from '../../src/levels.js';
import {reconstruct,matchVisits} from './native-level-map.js';
export type NativeAreaCommand={x:number;id:number};
export function decodeAreaControls(rom:Uint8Array,pointer:number):NativeAreaCommand[]{
 const out:NativeAreaCommand[]=[];let page=0;
 for(let offset=0;offset<256;offset+=2){
  const at=16+pointer-0x8000+offset,a=rom[at];if(a===0xfd)break;
  const b=rom[at+1];if(b&0x80)page++;
  if((a&15)!==13)continue;
  if(!(b&0x40)){page=b&31;continue;}
  const kind=b&63,id=kind===1?48:kind===8?20:kind===9?23:kind===10?24:undefined;
  if(id!==undefined)out.push({x:page*256+(a&240),id});
 }
 return out;
}
/** Decode every special row13 object after the two-byte area header. */
export function decodeAreaControlObjects(rom:Uint8Array,pointer:number){
 const objects:{column:number;command:number;offset:number}[]=[];let page=0;
 for(let offset=2;offset<256;offset+=2){
  const at=16+pointer-0x8000+offset,a=rom[at];if(a===0xfd)break;
  const b=rom[at+1];if(b&0x80)page++;
  if((a&15)!==13)continue;
  if(!(b&0x40)){page=b&31;continue;}
  objects.push({column:page*16+(a>>4),command:b&63,offset});
 }
 return {objects};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{rom:{type:'string'},traces:{type:'string'},out:{type:'string',default:'data/native-area-controls.json'}}});
 if(!a.rom||!a.traces)throw Error('--rom and --traces required');
 const rom=new Uint8Array(fs.readFileSync(a.rom)),areas:{level:string;area:string;commands:NativeAreaCommand[];source:{pointer:number;offset:number}[]}[]=[];
 for(const level of observedLevels()){
  const trace=new Uint8Array(fs.readFileSync(path.join(a.traces,level.id,'ram.bin'))),raw=reconstruct(trace,level.id),matches=matchVisits(level,raw.visits);
  for(let i=0;i<raw.visits.length;i++){
   const {area,offset}=matches[i],spec=level.areas.find(a=>a.id===area)!;
   const commands=decodeAreaControls(rom,raw.visits[i].ptr).map(c=>({...c,x:c.x+offset*16})).filter(c=>c.x>=0&&c.x<spec.width);
   let entry=areas.find(e=>e.level===level.id&&e.area===area);
   if(!entry){entry={level:level.id,area,commands:[],source:[]};areas.push(entry);}
   for(const command of commands)if(!entry.commands.some(c=>c.x===command.x&&c.id===command.id))entry.commands.push(command);
   if(!entry.source.some(s=>s.pointer===raw.visits[i].ptr&&s.offset===offset))entry.source.push({pointer:raw.visits[i].ptr,offset});
  }
 }
 for(const area of areas)area.commands.sort((a,b)=>a.x-b.x);
 const previous=JSON.parse(fs.readFileSync('data/native-area-controls.json','utf8'));
 const bindings={...previous.bindings,'2-2/area-2':{stream:'ae47',origin:0},'7-2/area-4':{stream:'ae47',origin:0}};
 const streams=Object.fromEntries([...new Set<string>(Object.values(bindings).map((b:any)=>b.stream))].map(stream=>[stream,decodeAreaControlObjects(rom,parseInt(stream,16))]));
 fs.writeFileSync(a.out!,JSON.stringify({romSha256:createHash('sha256').update(rom).digest('hex'),source:'Native ROM row-$0D commands: FlagpoleObject/AreaFrenzy; bound to remake areas by native block-buffer geometry (native-level-map.ts). Positions are level data, not replay camera/frame thresholds.',areas,method:previous.method,streams,bindings},null,2)+'\n');
 console.log(`${areas.length} areas, ${areas.reduce((n,a)=>n+a.commands.length,0)} commands`);
}

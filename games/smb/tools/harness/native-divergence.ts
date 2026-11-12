/** First frame where the simulation, replayed headlessly from an observed level entrance, stops matching the native NES.
 * Input per level: a directory with initial.ram (RAM before the first pad), pads.bin (one NES pad byte per PPU frame) and
 * ram.bin (2048 bytes of RAM after each pad), plus the entrance.json receipt of the matching recording.
 *   npx tsx tools/harness/native-divergence.ts --traces DIR --entrances media/recordings/threejs-2d [--levels 4-3,1-2] [--json out.json] [--detail 4-3]
 * Fields compared every frame: death, HUD timer, score, coins, and (while both are in normal play) Mario's x and y pixel. Pipe intros show blank 000 digits natively and the entrance walk shows a 401 preload, so neither is timed. Read-only measurement tooling; never used by the browser game. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';
import {observedLevels} from '../../src/levels.js';
import type {Button} from '../../src/types.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';

const nesButtons:Button[]=['a','b','select','start','up','down','left','right'];
const digits=(r:Uint8Array,a:number,n:number)=>Array.from(r.subarray(a,a+n)).reduce((s,v)=>s*10+v,0);
export type Divergence={level:string,frames:number,first:number|null,fields:Record<string,number|null>,at?:{field:string,native:number,sim:number}[]};

export function nativeRow(r:Uint8Array){
 return {time:digits(r,0x7f8,3),score:digits(r,0x7dd,6)*10,coins:r[0x75e],x:r[0x6d]*256+r[0x86],y:r[0xce],
  play:r[0x770]===1&&r[0x772]===3&&r[0x0e]===8,level:`${r[0x75f]+1}-${r[0x75c]+1}`,mode:r[0x770],dead:Number(r[0x0e]===6||r[0x0e]===11),engine:r[0x0e]};
}

export function divergence(dir:string,receiptPath:string,level:string,detail=false):Divergence{
 const initial=new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin'));
 const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
 const sim=new Simulation(observedLevels());sim.reset(true);
 initializeEntrance(sim,decodeEntrance(initial,receipt));sim.step([],0);sim.inputs=[];
 const fields:Record<string,number|null>={dead:null,time:null,score:null,coins:null,x:null,y:null};const at:{field:string,native:number,sim:number}[]=[];
 /* Native x is level-absolute: a bonus/pipe room can continue at a later page, so each later area visit is aligned on its first compared frame. */
 let area=sim.area.id,xOffset:number|undefined=0;
 for(let f=0;f<pads.length;f++){
  sim.step(nesButtons.filter((_,b)=>pads[f]&(1<<b)),1);
  const n=nativeRow(new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048));
  if(n.mode!==1||n.level!==level||sim.level.id!==level)break;
  if(sim.area.id!==area){area=sim.area.id;xOffset=undefined;}
  const pos=n.play&&sim.phase==='play';if(pos&&xOffset===undefined)xOffset=n.x-Math.floor(sim.player.x);
  const s={time:sim.time,score:sim.score,coins:sim.coins,x:Math.floor(sim.player.x)+(xOffset??0),y:(Math.floor(sim.player.y)-32)&255,dead:Number(['dying','gameover'].includes(sim.phase))};
  const checks:[string,boolean][]=[['dead',true],['time',!(sim.area.autoWalk&&n.time===0)&&n.engine!==7],['score',true],['coins',true],['x',pos],['y',pos]];
  for(const [k,on] of checks){const nv=n[k as keyof typeof n] as number,sv=s[k as keyof typeof s];
   if(on&&fields[k]===null&&nv!==sv){fields[k]=f;if(detail)at.push({field:k,native:nv,sim:sv});}}
 }
 const hits=Object.values(fields).filter((v):v is number=>v!==null);
 return {level,frames:pads.length,first:hits.length?Math.min(...hits):null,fields,...(detail?{at}:{})};
}

if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},levels:{type:'string'},json:{type:'string'},detail:{type:'boolean',default:false}}});
 if(!a.traces||!a.entrances)throw Error('--traces and --entrances are required');
 const levels=a.levels?.split(',')??Array.from({length:32},(_,n)=>`${Math.floor(n/4)+1}-${n%4+1}`);
 const out:Divergence[]=[];
 for(const level of levels){
  const r=divergence(path.join(a.traces,level),path.join(a.entrances,level,'entrance.json'),level,a.detail);out.push(r);
  console.log([level.padEnd(4),String(r.first??'-').padStart(5),...Object.entries(r.fields).map(([k,v])=>`${k}=${v??'-'}`),r.at?JSON.stringify(r.at):''].join(' '));
 }
 if(a.json)fs.writeFileSync(a.json,JSON.stringify(out,null,1)+'\n');
}

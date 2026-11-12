/** Mario's drawn pose per frame against the native NES: native PlayerGfxOffset $06D5 / 8 (the graphics-table cell, see src/player-cell.ts)
 * and PlayerFacingDir $33 against the remake's playerCell() after the same pad, replayed from the level entrance as native-divergence.ts.
 *   npx tsx tools/harness/native-pose.ts --traces DIR --entrances media/recordings/threejs-2d [--levels 1-2] [--detail] [--json out.json]
 * Add --fixture tests/fixtures/native-player-pose.json to retain the native entrance, pads and expected drawn cells/palette phases for replay tests.
 * Frames compared: while both are in normal play (native engine 8 or the entrance walk 7, remake phase 'play'), before the level's first state divergence
 * (native-divergence.ts) and before the native run leaves the level. Prints per level the compared frames, cell and facing mismatches,
 * the first cell mismatch and the commonest native->remake cell pairs. Read-only measurement tooling; never used by the browser game. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';
import {observedLevels} from '../../src/levels.js';
import {playerCell} from '../../src/player-cell.js';
import type {Button} from '../../src/types.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
import {nativeRow,divergence} from './native-divergence.js';

const nesButtons:Button[]=['a','b','select','start','up','down','left','right'];
export type PoseReport={level:string,compared:number,cell:number,facing:number,first:number|null,firstFacing:number|null,pairs:Record<string,number>,rows?:string[]};

export function comparePose(entrance:unknown,pads:ArrayLike<number>,frameRam:(f:number)=>Uint8Array,level:string,end:number,detail=false):PoseReport{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,entrance);sim.step([],0);sim.inputs=[];
 const r:PoseReport={level,compared:0,cell:0,facing:0,first:null,firstFacing:null,pairs:{},...(detail?{rows:[]}:{})};
 for(let f=0;f<Math.min(end,pads.length);f++){
  sim.step(nesButtons.filter((_,b)=>pads[f]&(1<<b)),1);
  const raw=frameRam(f),n=nativeRow(raw);if(n.mode!==1||n.level!==level||sim.level.id!==level)break;
  if(n.engine!==7&&n.engine!==8||sim.phase!=='play')continue;
  const {cell,facing}=playerCell(sim),nc=raw[0x6d5]>>3,nf=raw[0x33]===2?-1:1;r.compared++;
  if(nc!==cell){r.cell++;r.first??=f;const k=`${nc}->${cell}`;r.pairs[k]=(r.pairs[k]??0)+1;}
  if(nf!==facing){r.facing++;r.firstFacing??=f;}
  if(detail&&(nc!==cell||nf!==facing))r.rows!.push(`${f} native ${nc}${nf<0?'L':'R'} ctrl ${raw[0x70d]} tmr ${raw[0x781]} set ${raw[0x70c]} | remake ${cell}${facing<0?'L':'R'} ${JSON.stringify(sim.locomotionPose)}`);
 }
 return r;
}

if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},levels:{type:'string'},json:{type:'string'},fixture:{type:'string'},detail:{type:'boolean',default:false}}});
 if(!a.traces||!a.entrances)throw Error('--traces and --entrances are required');
 const levels=a.levels?.split(',')??Array.from({length:32},(_,n)=>`${Math.floor(n/4)+1}-${n%4+1}`);
 const out:PoseReport[]=[],cases:unknown[]=[];let tc=0,tm=0,tf=0;
 for(const level of levels){
  const dir=path.join(a.traces,level),receipt=path.join(a.entrances,level,'entrance.json');
  const initial=new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin'));
  const end=divergence(dir,receipt,level).first??pads.length;
  const entrance=decodeEntrance(initial,JSON.parse(fs.readFileSync(receipt,'utf8')));
  const r=comparePose(entrance,pads,f=>new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048),level,end,a.detail);
  if(a.fixture&&r.compared){
   const rows:number[][]=[];
   for(let f=0;f<Math.min(end,pads.length);f++){
    const raw=ram.subarray(f*2048,(f+1)*2048),n=nativeRow(raw);
    if(n.mode!==1||n.level!==level)break;
    if(n.engine===7||n.engine===8)rows.push([f,raw[0x6d5]>>3,raw[0x33]===2?-1:1,raw[0x6d4]]);
   }
   cases.push({level,entrance,pads:[...pads.subarray(0,end)],rows});
  }
  out.push(r);tc+=r.compared;tm+=r.cell;tf+=r.facing;
  const top=Object.entries(r.pairs).sort((x,y)=>y[1]-x[1]).slice(0,5).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`${level.padEnd(4)} end ${String(end).padStart(5)} compared ${String(r.compared).padStart(5)} cell ${String(r.cell).padStart(4)} facing ${String(r.facing).padStart(4)} first ${r.first??'-'} ${top}`);
  if(a.detail)for(const row of r.rows!)console.log('  '+row);
 }
 console.log(`all compared ${tc} cell mismatches ${tm} (${(100*tm/Math.max(1,tc)).toFixed(2)}%) facing ${tf}`);
 if(a.json)fs.writeFileSync(a.json,JSON.stringify(out,null,1)+'\n');
 if(a.fixture)fs.writeFileSync(a.fixture,JSON.stringify({source:'v2 native RAM, rows [frame,PlayerGfxOffset $06D5 / 8,PlayerFacingDir $33,ColorRotateOffset $06D4], before first state divergence; generated by tools/harness/native-pose.ts',cases})+'\n');
}

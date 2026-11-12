/** Audit every victory and following load row from the recorded entrance, without stopping at an earlier gameplay divergence.
 * npx tsx tools/harness/native-victory-audit.ts --traces DIR --entrances DIR [--levels 1-4,2-4] [--json FILE]
 * Entity coverage gaps remain explicit. This audit does not claim picture/OAM equivalence. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';import {playerCell} from '../../src/player-cell.js';
import type {Button} from '../../src/types.js';import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences} from './native-strict-entities.js';
const buttons:Button[]=['a','b','select','start','up','down','left','right'];
const digits=(r:Uint8Array,a:number,n:number)=>Array.from(r.subarray(a,a+n)).reduce((v,d)=>v*10+d,0);
export function auditVictory(dir:string,receipts:string,level:string){
 const initial=fs.readFileSync(path.join(dir,level,'initial.ram')),pads=fs.readFileSync(path.join(dir,level,'pads.bin')),ram=fs.readFileSync(path.join(dir,level,'ram.bin'));
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,JSON.parse(fs.readFileSync(path.join(receipts,level,'entrance.json'),'utf8'))));sim.inputs=[];
 const fields:Record<string,number|null>={},samples:unknown[]=[],gaps=new Map<string,{first:number,count:number,detail:string}>();let frames=0,victoryFrames=0,started=false,walkOwned=false;
 const gap=(f:number,detail:string)=>{const g=gaps.get(detail);if(g)g.count++;else gaps.set(detail,{first:f,count:1,detail});};
 const check=(f:number,k:string,n:unknown,s:unknown)=>{fields[k]??=null;if(JSON.stringify(n)!==JSON.stringify(s)&&fields[k]===null){fields[k]=f;samples.push({frame:f,field:k,native:n,sim:s});}};
 let before:Uint8Array|undefined;
 for(let f=0;f<pads.length;f++){
  const r=ram.subarray(f*2048,(f+1)*2048);sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);
  if(r[0x770]===2)started=true;if(!started){before=r;continue;}frames++;
  check(f,'level',`${r[0x75f]+1}-${r[0x75c]+1}`,sim.level.id);check(f,'dead',r[14]===6||r[14]===11,['dying','gameover'].includes(sim.phase));
  check(f,'time',digits(r,0x7f8,3),sim.time);check(f,'score',digits(r,0x7dd,6)*10,sim.score);check(f,'coins',r[0x75e],sim.coins);
  check(f,'camera',r[0x71a]*256+r[0x71c],Math.floor(sim.camera));check(f,'x',r[0x6d]*256+r[0x86],Math.floor(sim.player.x));check(f,'y',r[0xce],(Math.floor(sim.player.y)-32)&255);
  check(f,'frameCounter',r[9],sim.random.frame);check(f,'random',Array.from(r.subarray(0x7a7,0x7ae)),sim.random.bytes);check(f,'interval',r[0x77f],sim.intervalControl);
  if(r[0x770]===2){
   victoryFrames++;const n=sim.nativeVictory;if(!n)gap(f,'native victory mode has no remake control state');
   check(f,'task',r[0x772],n?.task);
   if(before?.[0x772]===2&&before?.[0x770]===2)walkOwned=true;
   for(const [key,a]of [['primary',0x719],['secondary',0x749],['endTimer',0x7a1],['feet',0x364],['controls',0x363],['bridge',0x369],['scrollFraction',0x768]] as const)check(f,key,r[a],n?.[key]);
   if(r[0x772]>=2)check(f,'destination',r[0x34],n?.destination);if(walkOwned)check(f,'walk',r[0x35],n?.walk);
   if(before?.[0x770]===2)check(f,'cell',r[0x6d5]>>3,playerCell(sim).cell); // axe-touch OAM is blank; its stale cell is not a draw.
   const native=strictNativeEntities(r),entities=strictSimEntities(sim);
   // The Bowser rear is a genuine enemy alias, not an extra independent actor.
   for(let slot=0;slot<6;slot++)if((r[15+slot]&128)&&r[22+slot]===45){
    native.gaps=native.gaps.filter(g=>!(g.code==='native-alias'&&g.slot===slot));native.entities.push({bank:'enemy',slot,kind:'bowser-rear',x:r[0x6e+slot]*256+r[0x87+slot],y:r[0xcf+slot],source:'bowser-rear'});
   }
   for(const e of sim.enemies)if(e.active&&e.nativeBowser?.rearSlot!==undefined){const b=e.nativeBowser;entities.push({bank:'enemy',slot:b.rearSlot,kind:'bowser-rear',x:b.x+(b.direction&1?-16:16),y:b.y+8,source:'bowser-rear'});}
   const result=strictEntityDifferences(native,entities);for(const g of result.gaps)gap(f,`${g.code}: ${g.detail}`);
   for(const m of result.mismatches)check(f,`enemy.${m.code}`,m.native??null,m.sim??null);
  }else if(sim.levelLoad){
   for(const [key,a]of [['task',0x772],['engine',14],['screen',0x73c],['disable',0x774]] as const)check(f,`load.${key}`,r[a],sim.levelLoad[key]);
  }else gap(f,'native post-victory load has no remake load state');
  before=r;
 }
 const first=Object.values(fields).filter((f):f is number=>f!==null).sort((a,b)=>a-b)[0]??null;
 return {level,status:!started?'not-reached':first!==null?'diverged':gaps.size?'incomplete':'pass',frames,victoryFrames,first,fields,gaps:[...gaps.values()],samples};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},levels:{type:'string'},json:{type:'string'}}});if(!a.traces||!a.entrances)throw Error('--traces and --entrances required');
 const reports=(a.levels?.split(',')??Array.from({length:32},(_,i)=>`${Math.floor(i/4)+1}-${i%4+1}`)).map(level=>auditVictory(a.traces!,a.entrances!,level));
 for(const r of reports)console.log(`${r.level} ${r.status} rows=${r.frames} victory=${r.victoryFrames} first=${r.first??'-'} gaps=${r.gaps.length} ${JSON.stringify(r.fields)}`);
 if(a.json)fs.writeFileSync(a.json,JSON.stringify(reports,null,1)+'\n');
}

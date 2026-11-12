/** Side-by-side rows of the native NES and the remake around a frame, for diagnosing a divergence found by native-divergence.ts.
 *   npx tsx tools/harness/native-peek.ts --traces DIR --entrances media/recordings/threejs-2d --level 4-3 --from 180 --to 190 [--enemies] [--ram 787,71f]
 * N: native (Mario x = page*256+$86 . sub-pixel $400, vx = ($57*256+$0705)/4096 px/frame, y = $CE, vy = $9F, engine $0E, HUD timer and score); S: remake (y shown as feet-32, the native $CE convention).
 * --enemies adds the five native enemy slots (id $16, state $1E, x with sub-pixel $401, y $CF) and the remake's active enemies (slot, kind, x, y-32).
 * --platforms adds the remake's platforms (spec x,y, width, collision x and y this frame).
 * --ram adds raw native bytes (hex addresses). Read-only measurement tooling; never used by the browser game. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';
import {observedLevels} from '../../src/levels.js';
import type {Button} from '../../src/types.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';

const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},level:{type:'string'},from:{type:'string',default:'0'},to:{type:'string'},enemies:{type:'boolean',default:false},platforms:{type:'boolean',default:false},ram:{type:'string',default:''}}});
if(!a.traces||!a.entrances||!a.level)throw Error('--traces, --entrances and --level are required');
const dir=path.join(a.traces,a.level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const from=Number(a.from),to=Math.min(Number(a.to??from+20),pads.length-1);
const sim:any=new Simulation(observedLevels());sim.reset(true);
initializeEntrance(sim,decodeEntrance(new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),JSON.parse(fs.readFileSync(path.join(a.entrances,a.level,'entrance.json'),'utf8'))));sim.step([],0);sim.inputs=[];
const nes:Button[]=['a','b','select','start','up','down','left','right'],dig=(r:Uint8Array,s:number,n:number)=>Array.from(r.subarray(s,s+n)).reduce((t,v)=>t*10+v,0);
const extra=a.ram.split(',').filter(Boolean).map(h=>parseInt(h,16));
for(let f=0;f<=to;f++){
 sim.step(nes.filter((_,b)=>pads[f]&(1<<b)),1);if(f<from)continue;
 const r=new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048);
 const n=`N e${r[0xe]} x${r[0x6d]*256+r[0x86]}.${r[0x400]} vx${(((r[0x57]<<24)>>24)*256+r[0x705])/4096} y${r[0xce]} vy${(r[0x9f]<<24)>>24} t${dig(r,0x7f8,3)} sc${dig(r,0x7dd,6)*10} c${r[0x75e]}${extra.map(x=>` ${x.toString(16)}=${r[x]}`).join('')}`;
 const s=`S ${sim.phase} ${sim.area.id} x${Math.floor(sim.player.x)}.${Math.floor((sim.player.x%1)*256)} vx${sim.player.vx.toFixed(4)} y${Math.floor(sim.player.y)-32} vy${sim.player.vy.toFixed(2)} t${sim.time} sc${sim.score} c${sim.coins} cam${Math.floor(sim.camera)}/${r[0x71a]*256+r[0x71c]}`;
 console.log(`${f} pad ${pads[f].toString(16).padStart(2,'0')} | ${n} | ${s}`);
 if(a.platforms)console.log('   P:'+(sim.area.platforms??[]).map((q:any)=>{const c=sim.platformMotion.collisionPosition(q,sim.platformFrame);return ` [${q.x},${q.y} slot${sim.platformSlots.get(q)??'-'} w${q.width} x${c.x.toFixed(2)} y${c.y.toFixed(2)}]`;}).join(''));
 if(a.platforms)console.log('   slot sub:'+sim.slotSub.join(','));
 if(a.enemies){
  console.log('   N:'+[0,1,2,3,4].filter(k=>r[0xf+k]).map(k=>` [${k} id${r[0x16+k]} st${r[0x1e+k]} x${r[0x6e+k]*256+r[0x87+k]}.${r[0x401+k]} y${r[0xcf+k]}]`).join(''));
  console.log('   S:'+sim.enemies.filter((e:any)=>e.active&&e.dead<90).map((e:any)=>` [${e.enemySlot??'-'} ${e.kind} x${e.x.toFixed(3)} y${Math.floor(e.y)-32}${e.shell?' shell':''}${e.dead?' dead'+e.dead:''}]`).join(''));
 }
}

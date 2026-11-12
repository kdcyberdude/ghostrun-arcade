// scratch probe (not committed): remake FirebarSlots units vs native firebar angle bytes per slot
import fs from 'node:fs';import path from 'node:path';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
const [level,toS,everyS]=process.argv.slice(2);const S=process.env.S!;
const dir=path.join(S,'native/traces',level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const sim:any=new Simulation(observedLevels());sim.reset(true);
initializeEntrance(sim,decodeEntrance(new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),JSON.parse(fs.readFileSync(path.join('/home/kd/Desktop/proj/ghostrun/media/recordings/threejs-2d',level,'entrance.json'),'utf8'))));sim.step([],0);sim.inputs=[];
const nes=['a','b','select','start','up','down','left','right'];let bad=0;
for(let f=0;f<=Number(toS)&&f<pads.length;f++){sim.step(nes.filter((_,b)=>pads[f]&(1<<b)),1);
 const r=new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048);if(r[0x770]!==1||sim.phase!=='play')continue;
 const slots=sim.firebarSlots?.slots??[];const out:string[]=[];
 for(let s=0;s<5;s++){const id=r[0x16+s];const nat=r[0xf+s]&&id>=27&&id<=31?((r[0xa0+s]&31)*32+(r[0x58+s]>>3)+768)%1024:undefined;const rem=slots[s]?.units;
  if(nat!==rem){out.push(`s${s} nat${nat}(${r[0x6e+s]*256+r[0x87+s]}) rem${rem}(${slots[s]?.bar.x})`);}}
 if(out.length&&(bad++<Number(everyS??20)))console.log(f,out.join(' '));
}
console.log('mismatch rows',bad);

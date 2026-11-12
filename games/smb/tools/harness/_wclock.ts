import fs from 'node:fs';import path from 'node:path';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
const [traces,entr,...levels]=process.argv.slice(2);
for(const level of levels){const dir=path.join(traces,level);const ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const sim:any=new Simulation(observedLevels());sim.reset(true);
initializeEntrance(sim,decodeEntrance(new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),JSON.parse(fs.readFileSync(path.join(entr,level,'entrance.json'),'utf8'))));sim.step([],0);sim.inputs=[];
const nes=['a','b','select','start','up','down','left','right'];const pairs:Record<string,number>={};let ic:Record<string,number>={};
for(let f=0;f<pads.length;f++){sim.step(nes.filter((_,b)=>pads[f]&(1<<b)),1);const r=new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048);if(sim.level.id!==level)break;
 const c=((sim.lifeRow-1-sim.lifeFrozen)%21+21)%21;const k=`${sim.phase}:${c}->${r[0x77f]}`;pairs[k]=(pairs[k]??0)+1;
 const k2=`${sim.phase}:${sim.area.id}:${sim.intervalControl===r[0x77f]}`;ic[k2]=(ic[k2]??0)+1;}
const m:Record<string,Set<number>>={};for(const k of Object.keys(pairs)){const [a,b]=k.split('->');(m[a]??=new Set()).add(Number(b));}
console.log(level,Object.entries(m).filter(([k])=>k.startsWith('play')).map(([k,v])=>k+'=>'+[...v].join('/')).join(' '));console.log(ic);}

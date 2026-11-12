import fs from 'node:fs';import path from 'node:path';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
const [traces,entr,level,to]=process.argv.slice(2);const dir=path.join(traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const sim:any=new Simulation(observedLevels());sim.reset(true);
initializeEntrance(sim,decodeEntrance(new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),JSON.parse(fs.readFileSync(path.join(entr,level,'entrance.json'),'utf8'))));sim.step([],0);sim.inputs=[];
const nes=['a','b','select','start','up','down','left','right'];let ok=true;
for(let f=0;f<=Number(to);f++){sim.step(nes.filter((_,b)=>pads[f]&(1<<b)),1);const r=new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048);
 if(process.env.AT&&f===Number(process.env.AT))console.log("AT",f,r[9],sim.random.frame);if(process.env.BDBG&&f>320&&f<480&&(f<335||f%10==0))console.log("F",f,r[9],sim.random.frame,r[0xe],sim.phase,sim.area.id);const same=r[9]===sim.random.frame&&sim.random.bytes.every((v:number,i:number)=>v===r[0x7a7+i]),i77=r[0x77f]===sim.intervalControl;
 if(same!==ok){console.log(f,'sync',same,'i77',i77,'77f',r[0x77f],sim.intervalControl,'9',r[9],sim.random.frame,'e',r[0xe],sim.phase,sim.area.id);ok=same;}}

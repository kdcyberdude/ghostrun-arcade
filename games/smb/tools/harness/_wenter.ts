import fs from 'node:fs';import path from 'node:path';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
const [traces,entr]=process.argv.slice(2);
for(let n=0;n<32;n++){const level=`${Math.floor(n/4)+1}-${n%4+1}`;const dir=path.join(traces,level);if(!fs.existsSync(dir))continue;const ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const sim:any=new Simulation(observedLevels());sim.reset(true);
initializeEntrance(sim,decodeEntrance(new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),JSON.parse(fs.readFileSync(path.join(entr,level,'entrance.json'),'utf8'))));sim.step([],0);sim.inputs=[];
const nes=['a','b','select','start','up','down','left','right'];let area=sim.area.id,lvl=sim.level.id,lastLoad=-1;
for(let f=0;f<pads.length;f++){sim.step(nes.filter((_,b)=>pads[f]&(1<<b)),1);const r=new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048),q=f?new Uint8Array(ram.buffer,ram.byteOffset+f*2048-2048,2048):r;
 if(r[9]===0&&q[9]!==255&&f)lastLoad=f;
 if(sim.level.id!==lvl)break;
 if(sim.area.id!==area){const same=r[9]===sim.random.frame&&sim.random.bytes.every((v:number,i:number)=>v===r[0x7a7+i]);
  const held=sim.random.bytes.every((v:number,i:number)=>v===((r[0x7a7+i]<<1)&255|(i<6?r[0x7a8+i]>>7:0))||i===6);
  console.log(level,f,area,'->',sim.area.id,'phase',sim.phase,'n9',r[9],'s9',sim.random.frame,'since0',f-lastLoad,'sync',same,'oneAhead',held,'77f',r[0x77f],sim.intervalControl,'e',r[0xe]);area=sim.area.id;}
}}

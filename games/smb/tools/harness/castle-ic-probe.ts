// scratch probe (not committed): native $077F vs remake intervalControl and podoboo timers
import fs from 'node:fs';import path from 'node:path';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
const [level,fromS,toS]=process.argv.slice(2);const S=process.env.S!;
const dir=path.join(S,'native/traces',level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const sim:any=new Simulation(observedLevels());sim.reset(true);
initializeEntrance(sim,decodeEntrance(new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),JSON.parse(fs.readFileSync(path.join('/home/kd/Desktop/proj/ghostrun/media/recordings/threejs-2d',level,'entrance.json'),'utf8'))));sim.step([],0);sim.inputs=[];
const nes=['a','b','select','start','up','down','left','right'];
for(let f=0;f<=Number(toS);f++){sim.step(nes.filter((_,b)=>pads[f]&(1<<b)),1);if(f<Number(fromS))continue;
 const r=new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048);
 console.log(f,'N e',r[0xe],'77f',r[0x77f],'t',[0,1,2,3,4].map(k=>r[0x796+k]).join('/'),'| S',sim.phase,'ic',sim.intervalControl,'pods',sim.enemies.filter((e:any)=>e.pod).map((e:any)=>`${e.enemySlot}:${e.pod.timer}`).join(' '));
}

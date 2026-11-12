import fs from 'node:fs';
import {Simulation} from './src/simulation.js';
import {observedLevels} from './src/levels.js';
import {decodeEntrance,initializeEntrance} from './tools/harness/native-entrance.mjs';
const T=process.env.S+'/native/traces',E='/home/kd/Desktop/proj/ghostrun/media/recordings/threejs-2d';
const names=['a','b','select','start','up','down','left','right'];
const [L,from,to]=[process.argv[2],Number(process.argv[3]),Number(process.argv[4])];
const dir=`${T}/${L}`,initial=new Uint8Array(fs.readFileSync(dir+'/initial.ram')),ram=fs.readFileSync(dir+'/ram.bin'),pads=fs.readFileSync(dir+'/pads.bin');
const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,JSON.parse(fs.readFileSync(`${E}/${L}/entrance.json`,'utf8'))));sim.step([],0);sim.inputs=[];
for(let f=0;f<=to;f++){sim.step(names.filter((_,b)=>pads[f]&(1<<b)) as any,1);const r=ram.subarray(f*2048,f*2048+2048);if(f<from)continue;
 const n=[0,1,2,3,4].filter(k=>r[0xf+k]&&r[0x16+k]===7).map(k=>`s${k}:${r[0x6e+k]*256+r[0x87+k]},${r[0xcf+k]}`).join(' ');
 const s=sim.enemies.filter((e:any)=>e.kind==='blooper'&&e.active&&!e.dead).map((e:any)=>`s${e.enemySlot}:${Math.floor(e.x)},${(Math.floor(e.y)-24)&255} age${e.age} b${JSON.stringify(e.bloop)}`).join(' ');
 console.log(f,'fc',r[9],'N',n,'| R fc',sim.random.frame,s);}

import fs from 'node:fs';
import {Simulation} from './src/simulation.js';
import {observedLevels} from './src/levels.js';
import {decodeEntrance,initializeEntrance} from './tools/harness/native-entrance.mjs';
import {divergence} from './tools/harness/native-divergence.js';
const T=process.env.S+'/native/traces',E='/home/kd/Desktop/proj/ghostrun/media/recordings/threejs-2d';
const names=['a','b','select','start','up','down','left','right'];
for(const L of (process.argv[2]??'').split(',')){
 const dir=`${T}/${L}`,initial=new Uint8Array(fs.readFileSync(dir+'/initial.ram')),ram=fs.readFileSync(dir+'/ram.bin'),pads=fs.readFileSync(dir+'/pads.bin');
 const first=divergence(dir,`${E}/${L}/entrance.json`,L).first;
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,JSON.parse(fs.readFileSync(`${E}/${L}/entrance.json`,'utf8'))));sim.step([],0);sim.inputs=[];
 let last='',area=sim.area.id;
 for(let f=0;f<pads.length;f++){sim.step(names.filter((_,b)=>pads[f]&(1<<b)) as any,1);const r=ram.subarray(f*2048,f*2048+2048);
  if(r[0x770]!==1||sim.level.id!==L)break;
  const d=(sim.random.frame-r[9])&255,bd=(sim.broClock-r[9])&255;const k=`d${d} area ${sim.area.id}`;
  if(k!==last||sim.area.id!==area){console.log(L,f,'native',r[9],'eng',r[0xe],'remake',sim.random.frame,k,first!==null&&f>=first?'(after div)':'');last=k;area=sim.area.id;}
 }
}

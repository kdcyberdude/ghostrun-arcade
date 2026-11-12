import fs from 'node:fs';
import {Simulation} from './src/simulation.js';
import {observedLevels} from './src/levels.js';
import {decodeEntrance,initializeEntrance} from './tools/harness/native-entrance.mjs';
const [L,from,to]=[process.argv[2],Number(process.argv[3]),Number(process.argv[4])];
const S=process.env.S!,dir=`${S}/pixels/native/${L}`;
const initial=new Uint8Array(fs.readFileSync(dir+'/initial.ram')),ram=fs.readFileSync(dir+'/ram.bin'),pads=fs.readFileSync(dir+'/pads.bin');
const sim=new Simulation(observedLevels());sim.reset(true);
initializeEntrance(sim,decodeEntrance(initial,JSON.parse(fs.readFileSync(`/home/kd/Desktop/proj/ghostrun/media/recordings/threejs-2d/${L}/entrance.json`,'utf8'))));
sim.step([],0);sim.inputs=[];
const names=['a','b','select','start','up','down','left','right'];
for(let f=0;f<=to;f++){sim.step(names.filter((_,b)=>pads[f]&(1<<b)) as any,1);
 const r=ram.subarray(f*2048,(f+1)*2048);
 if(f>=from)console.log(f,'native 70c',r[0x70c],'70d',r[0x70d],'x',r[0x6d]*256+r[0x86],'| remake',JSON.stringify(sim.locomotionPose),'x',sim.player.x.toFixed(2),'anim',(sim.player as any).anim,'phase',sim.phase,'timer',(sim as any).walkPoseTimer);}

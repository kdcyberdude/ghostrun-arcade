import fs from 'node:fs';
import {Simulation} from './src/simulation.js';
import {observedLevels} from './src/levels.js';
import {playerCell} from './src/player-cell.js';
import {decodeEntrance,initializeEntrance} from './tools/harness/native-entrance.mjs';
const T=process.env.S+'/native/traces',E='/home/kd/Desktop/proj/ghostrun/media/recordings/threejs-2d';
const names=['a','b','select','start','up','down','left','right'];
const [L,from,to]=[process.argv[2],Number(process.argv[3]),Number(process.argv[4])];
const dir=`${T}/${L}`,initial=new Uint8Array(fs.readFileSync(dir+'/initial.ram')),ram=fs.readFileSync(dir+'/ram.bin'),pads=fs.readFileSync(dir+'/pads.bin');
const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,JSON.parse(fs.readFileSync(`${E}/${L}/entrance.json`,'utf8'))));sim.step([],0);sim.inputs=[];
for(let f=0;f<=to;f++){sim.step(names.filter((_,b)=>pads[f]&(1<<b)) as any,1);const r=ram.subarray(f*2048,f*2048+2048);
 if(f<from)continue;const a=sim.playerAnim,c=playerCell(sim);
 console.log(f,'pad',pads[f].toString(16),'N eng',r[0xe],'st',r[0x1d],'cell',r[0x6d5]>>3,'ctrl',r[0x70d],'tmr',r[0x781],'set',r[0x70c],'spd',(r[0x57]<<24>>24),'abs',r[0x700],'mv',r[0x45],'fc',r[0x33],'swt',r[0x782],'| R',sim.phase,'g',+sim.player.grounded,'cell',c.cell,'ctrl',a.ctrl,'tmr',a.timer,'set',a.timerSet,'spd',Math.floor(sim.motor.speed/256),'abs',sim.motor.absolute,'mv',sim.motor.moving,'fc',sim.motor.facing,'duck',+sim.player.duck,'wt',sim.water.timer);}

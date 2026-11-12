// scratch probe (not committed)
import fs from 'node:fs';import path from 'node:path';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
const [level,fromS,toS]=process.argv.slice(2);const S=process.env.S!;
const dir=path.join(S,'native/traces',level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const sim:any=new Simulation(observedLevels());sim.reset(true);
initializeEntrance(sim,decodeEntrance(new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),JSON.parse(fs.readFileSync(path.join('/home/kd/Desktop/proj/ghostrun/media/recordings/threejs-2d',level,'entrance.json'),'utf8'))));sim.step([],0);sim.inputs=[];
const nes=['a','b','select','start','up','down','left','right'];
for(let f=0;f<=Number(toS);f++){sim.step(nes.filter((_,b)=>pads[f]&(1<<b)),1);if(f<Number(fromS))continue;
 const r=new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048);const cam=r[0x71a]*256+r[0x71c];
 const spr:string[]=[];for(let i=0;i<64;i++){const y=r[0x200+i*4],t=r[0x201+i*4],x=r[0x203+i*4];if(y<0xf0)spr.push(`${i}:${t.toString(16)}@${x},${y}`);}
 console.log(`${f} N e${r[0xe]} mx${r[0x6d]*256+r[0x86]} scr${r[0x86]-r[0x71c]&255} my${r[0xce]} cam${cam} pso${r[0x6e4]} eso${[0,1,2,3,4].map(k=>r[0x6e5+k]).join('/')} ang${[0,1,2,3,4].map(k=>r[0xa0+k]+':'+r[0x58+k]).join(' ')}`);
 console.log('  OAM '+spr.join(' '));
 console.log(`  S ${sim.phase} px${sim.player.x.toFixed(2)} py${(sim.player.y-32).toFixed(2)} scr${Math.floor(sim.player.x)-Math.floor(sim.camera)}`);
 for(const bar of sim.area.firebars??[]){const c=sim.firebarCenters(bar);if(c.length&&Math.abs(bar.x-sim.player.x)<120)console.log(`  bar ${bar.x},${bar.y} `+c.map((p:any)=>`${(p.x-sim.camera).toFixed(0)},${(p.y-32).toFixed(0)}`).join(' '));}
}

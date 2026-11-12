/** Inspect native special-slot power-up state against a normal remake replay, without any mid-run correction.
 * npx tsx tools/harness/native-powerup-peek.ts --traces DIR --entrances DIR --level 3-3 --from 395 --to 510 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';
import {observedLevels} from '../../src/levels.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
import type {Button} from '../../src/types.js';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},level:{type:'string'},from:{type:'string',default:'0'},to:{type:'string'}}});
if(!a.traces||!a.entrances||!a.level)throw Error('--traces, --entrances and --level required');
const dir=path.join(a.traces,a.level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),JSON.parse(fs.readFileSync(path.join(a.entrances,a.level,'entrance.json'),'utf8'))));sim.step([],0);sim.inputs=[];
const buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(let f=0;f<=Number(a.to??Number(a.from)+20);f++){
 sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);if(f<Number(a.from))continue;
 const r=ram.subarray(f*2048,(f+1)*2048),i=sim.items.find((i:any)=>i.nativePowerState!==undefined);
 console.log(f,`N id${r[0x1b]} st${r[0x23]} x${r[0x73]*256+r[0x8c]} y${r[0xd4]} speed${r[0xa5]} force${r[0x439]} fraction${r[0x41c]} frame${r[9]} cam${r[0x71a]*256+r[0x71c]}`,`S ${i?`st${i.nativePowerState} x${i.x} y${i.y-8}`:'gone'} ${JSON.stringify(sim.nativePowerSlot)} frame${sim.random.frame} cam${sim.camera}`);
}

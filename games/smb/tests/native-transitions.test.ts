import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import type {Excerpt} from '../tools/harness/native-excerpt.js';

// Native v2 RAM-trace replays (evidence/native-runs/<level>.v2.json, each pad on its native read row, empty input queue): the remake against the
// native RAM on the rows where an area entry, a life loss, a castle loop or a coin pickup happens.
const nes:Button[]=['a','b','select','start','up','down','left','right'];
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
function replay(level:string,until:number){
 const x:Excerpt=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${level}.v2.json`,import.meta.url),'utf8'));
 const pads=unpack(x.pads),ram=unpack(x.ram),n=x.addrs.length;
 const native=(f:number,a:number)=>ram[f*n+x.addrs.indexOf(a)];
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(x.initialRam),{level}));sim.step([],0);sim.inputs=[];
 const rows:{x:number;y:number;cam:number;time:number;coins:number;phase:string}[]=[];
 for(let f=0;f<=until;f++){sim.step(nes.filter((_,b)=>pads[f]&(1<<b)),1);rows.push({x:Math.floor(sim.player.x),y:Math.floor(sim.player.y)-32,cam:Math.floor(sim.camera),time:sim.time,coins:sim.coins,phase:sim.phase});}
 const n8=(f:number)=>({x:native(f,0x6d)*256+native(f,0x86),y:native(f,0xce),cam:native(f,0x71a)*256+native(f,0x71c),engine:native(f,0x0e),coins:native(f,0x75e),
  time:native(f,0x7f8)*100+native(f,0x7f9)*10+native(f,0x7fa)});
 return {rows,native:n8};
}

test('underground entry (PlayerEntrance): the pad drives Mario from the row after PlayerRdy, the first row that starts at y >= $30 (1-2 rows 366/367, 4-2 368/369)',()=>{
 for(const [level,ready] of [['1-2',366],['4-2',368]] as const){
  const {rows,native}=replay(level,ready+20);
  assert.equal(native(ready-1).engine,7);assert.equal(native(ready).engine,8);assert.equal(native(ready-1).y,48);
  for(let f=ready-1;f<=ready+20;f++){assert.equal(rows[f].x,native(f).x,`${level} row ${f}: x`);assert.equal(rows[f].y,native(f).y,`${level} row ${f}: y`);}
 }
});

test('life loss: the engine-6 row is still a death row, the HUD keeps the old time through the lives screen, and the screen ends on $077F ticks (1-1 rows 993, 1149)',()=>{
 const {rows,native}=replay('1-1',1160);
 assert.equal(native(993).engine,6);assert.equal(rows[993].phase,'dying');assert.equal(rows[994].phase,'intro');
 for(let f=994;f<=1147;f++)assert.equal(rows[f].time,native(f).time,`row ${f}: time`);
 assert.equal(native(1148).engine,7);assert.equal(native(1149).engine,8);assert.equal(rows[1148].phase,'intro');assert.equal(rows[1149].phase,'play');
 for(let f=1149;f<=1160;f++){assert.equal(rows[f].x,native(f).x,`row ${f}: x`);assert.equal(rows[f].time,native(f).time,`row ${f}: time`);}
});

test('castle loops (ProcLoopCommand): a wrong position when the parser reaches the loop page sends Mario and the screen back 1024 px on the next row',()=>{
 for(const [level,row] of [['7-4',523],['4-4',872],['8-4',674]] as const){
  const {rows,native}=replay(level,row+30);
  assert.ok(native(row-1).x-native(row).x>1000,`${level}: native loops back on row ${row}`);
  for(let f=row-2;f<=row+30;f++){assert.equal(rows[f].x,native(f).x,`${level} row ${f}: x`);assert.equal(rows[f].cam,native(f).cam,`${level} row ${f}: camera`);}
 }
});

test('coin pickup: left body probe x+2, and one coin per row (3-2 row 369, 2-2 rows 1323/1324)',()=>{
 let r=replay('3-2',370);
 for(const f of [366,367,368,369,370])assert.equal(r.rows[f].coins,r.native(f).coins,`3-2 row ${f}`);
 r=replay('2-2',1324);
 for(const f of [1322,1323,1324])assert.equal(r.rows[f].coins,r.native(f).coins,`2-2 row ${f}`);
});

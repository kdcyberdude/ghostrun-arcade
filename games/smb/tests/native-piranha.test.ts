import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {nativePiranhaStep,type NativePiranha} from '../src/simulation.js';

// Native Piranha Plant (id 13) checked on every frame of every recorded run (evidence/native-runs/*.json, any number of runs per level): a plant made in a
// slot starts hidden (speed +1, flag 0, timer 0, up = y - 24); a plant already live at the entrance starts from the initial RAM bytes. Each later frame runs
// nativePiranhaStep with the recorded FrameCounter and Mario x only; its y must equal the recorded y while the slot stays a plant.
const dir=new URL('../evidence/native-runs/',import.meta.url),unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
test('Piranha Plant y follows MovePiranhaPlant on every recorded frame (FrameCounter parity, Mario proximity, 0x40 waits)',()=>{
 let frames=0,plants=0;
 for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){
  const x=JSON.parse(fs.readFileSync(new URL(file,dir),'utf8')),ram=unpack(x.ram),init=unpack(x.initialRam),n=x.addrs.length;
  const at=(f:number,a:number)=>f<0?init[a]:ram[f*n+x.addrs.indexOf(a)];
  const live:(NativePiranha|undefined)[]=[0,1,2,3,4].map(k=>init[0xf+k]&&init[0x16+k]===13?{y:init[0xcf+k],speed:(init[0x58+k]<<24)>>24,flag:init[0xa0+k],up:init[0x417+k],down:init[0x434+k],timer:init[0x78a+k]}:undefined);
  for(let f=0;f<x.frames;f++)for(let k=0;k<5;k++){
   const plant=at(f,0xf+k)&&at(f,0x16+k)===13&&at(f,0x1e+k)===0,was=at(f-1,0xf+k)&&at(f-1,0x16+k)===13;
   if(!plant){live[k]=undefined;continue;}
   const y=at(f,0xcf+k);
   if(!was||!live[k]){live[k]={y,speed:1,flag:0,up:y-24,down:y,timer:0};plants++;continue;} // creation row: InitPiranhaPlant only
   if(![7,8].includes(at(f,0x0e)))continue; // enemies run only in normal play and pipe/vine motion (engine $0E 7, 8), not during an area load
   const s=live[k]!;nativePiranhaStep(s,at(f,0x6e+k)*256+at(f,0x87+k),at(f,0x6d)*256+at(f,0x86),at(f,0x09));
   assert.equal(s.y,y,`${x.level}.${x.run} row ${f} slot ${k}`);frames++;
  }
 }
 assert.ok(plants>=40&&frames>10000,`${plants} plants, ${frames} frames`);console.log(`${plants} plants, ${frames} frames`);
});

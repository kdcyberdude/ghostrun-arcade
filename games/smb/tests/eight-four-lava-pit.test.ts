import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {PlatformMotion} from '../src/platform-motion.js';

// 8-4 main lap 1 from the native collision map (RAM 0x500-0x69f, column c: byte ((c>>4)&1)*0xd0 + row*16 + (c&15), row 0 = y 32 = remake row 2)
// read on every on-screen column while replaying the recorded route from frame 75000 (tools/fidelity-lab/area-probe.mjs, 1,200 rows;
// evidence/lava84-findings-20261111.md). Native columns, rows 0..12, '62' solid, '00' empty:
const native:Record<number,string>={
 59:'62 00 00 00 00 00 00 00 00 00 00 62 62',
 62:'62 00 00 00 00 00 00 00 62 62 62 62 62',
 66:'62 00 00 00 00 00 00 00 00 00 00 00 00',
 72:'62 00 00 00 00 00 00 00 00 00 00 00 00',
 74:'62 00 00 00 00 00 00 00 00 00 00 00 00',
 75:'62 00 00 00 00 00 00 00 62 62 62 62 62',
 76:'62 00 00 00 62 00 00 00 62 62 62 62 62',
 79:'62 00 00 00 62 00 00 00 62 62 62 62 62',
 80:'62 00 00 00 00 00 00 00 62 62 62 62 62',
 39:'62 00 00 00 00 00 00 00 00 00 00 62 62',
 22:'62 00 00 00 00 00 00 00 00 00 00 62 62',
};

test('8-4 main lap 1 solid cells match the native collision map (pit 66-74, floor 59-63, wall 79-80, no pipe at 39-40)',()=>{
 const main=observedLevels().find(l=>l.id==='8-4')!.areas.find(a=>a.id==='main')!;
 const solid=new Set(main.tiles.map(([c,r])=>`${c},${r}`));
 for(const [col,cells] of Object.entries(native))cells.split(' ').forEach((v,row)=>assert.equal(solid.has(`${col},${row+2}`),v!=='00',`column ${col} remake row ${row+2}`));
 for(let col=66;col<=74;col++)for(let row=3;row<=14;row++)assert.ok(!solid.has(`${col},${row}`),`pit ${col},${row}`);
});

test('8-4 main: the id 40 lift over the pit follows the native rows, also one lap (1024 px) further right',()=>{
 // native slot 1, id 40, y 208: [route-probe row, camera, x]; created at row 633 (camera 819), 53 px horizontal cycle 1067..1120.
 const rows=[[633,819,1120],[647,851,1118],[662,889,1113],[677,919,1104],[692,931,1092],[707,931,1081],[722,931,1073],[752,931,1067],[812,1011,1094],[872,1087,1120],[932,1100,1092]];
 const spec=observedLevels().find(l=>l.id==='8-4')!.areas.find(a=>a.id==='main')!.platforms![0];
 for(const lap of [0,1024]){
  const motion=new PlatformMotion({levelId:'8-4',areaId:'main'}),platform={...spec,x:spec.x+lap};
  let k=0;const xs:number[]=[];
  for(let f=rows[0][0]-40;f<=rows.at(-1)![0];f++){
   while(k+1<rows.length&&rows[k+1][0]<=f)k++;
   motion.advance(f,(f<rows[0][0]?rows[0][1]-3-(rows[0][0]-f)*2:rows[k][1])+lap);
   const r=rows.find(r=>r[0]===f);if(r){const p=motion.collisionPosition(platform,f);xs.push(Math.round(p.x)-lap);assert.equal(p.y,208);}
  }
  xs.forEach((x,i)=>assert.ok(Math.abs(x-rows[i][2])<=1,`lap ${lap/1024} row ${rows[i][0]}: remake ${x} native ${rows[i][2]}`));
 }
});

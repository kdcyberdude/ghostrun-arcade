import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';

// Enemy inventories against native slot excerpts (rows of the recorded winning route, evidence/local/native-trace-winning-route-ram-20261109.jsonl;
// ram = five slots of flag, id, state, page, x low, y). Found by APPEAR=1 in tools/campaign-compare.ts (first appearances with no remake counterpart).
const objects=(ram:string)=>{
 const [flag,id,state,page,xl,y]=ram.split(',').map(h=>Array.from(Buffer.from(h,'hex')));
 return flag.map((f,i)=>f?{id:id[i],state:state[i],x:page[i]*256+xl[i],y:y[i]}:undefined).filter((e):e is {id:number,state:number,x:number,y:number}=>!!e);
};
const area=(level:string,id:string)=>structuredClone(observedLevels().find(l=>l.id===level)!).areas.find(a=>a.id===id)!;

test('8-4 main Goomba group: native creates ids 6 at x 897/920/944 together (row 75479, camera 643), the specs now start there',()=>{
 const native=objects('0101010100,0d06060600,0000000000,0303030304,388198b060,98b8b8b800,0170').filter(o=>o.id===6);
 assert.deepEqual(native.map(o=>o.x),[897,920,944]);
 const goombas=area('8-4','main').enemies.filter(e=>e.kind==='goomba');
 assert.deepEqual(goombas.map(e=>e.x),native.map(o=>o.x));
 assert.ok(goombas.every(e=>e.y===native[0].y+24&&e.spawnCamera===643));
});

// Expectation changed 2026-11-11: the native collision map (RAM 0x500-0x69f, evidence/lava84-findings-20261111.md) shows floor, not lava, at x 944-1023 too.
test('8-4 main floor under the Goomba group is solid to x 943 (native feet 208 there) and on to the pillar (native collision map)',()=>{
 const sim=new Simulation([structuredClone(observedLevels().find(l=>l.id==='8-4')!)]);sim.reset(true);
 for(const x of [880,896,921,928,942,960,1000])assert.ok((sim as any).isSolid(x,209),`x ${x}`);
});

test('8-4 plants: native id 13 at x 56 in the first row of area-2/4/5 and at 1304/1448 in the main passage',()=>{
 // first rows of area-2 (row 76192), area-4 (row 78289), area-5 (row 79163): slot 0 is the plant at x 56 (page 0, low 0x38), hidden y 176
 for(const ram of ['0101010101,0d0d0d0202,0000000000,0707080707,38a848d1f1,b088b0b8b8,0138','0100000000,0d00000000,0000000000,0001010101,3840404040,b000000000,0138','0101000001,0d0d000005,0000000000,1010111111,38a870700a,b0980000b8,0138']){
  const plant=objects(ram).find(o=>o.id===13)!;assert.deepEqual([plant.x%256,plant.y],[56,176]); // page = the area's start page, so the x low byte is the area x
 }
 for(const id of ['area-2','area-4','area-5'])assert.ok(area('8-4',id).enemies.some(e=>e.kind==='piranha'&&e.x===56&&e.y===200),id);
 assert.deepEqual(area('8-4','main').enemies.filter(e=>e.kind==='piranha').map(e=>e.x).sort((a,b)=>a-b),[312,824,1304,1448]);
});

test('8-2: koopas come from stomped Paratroopas (native row 70095: koopa 1075 beside Mario 1067), the screenshot koopa specs are gone',()=>{
 const rows=objects('0000010001,000000000e,0000000000,0505040503,c0c033c0f8,3828b00299,0171');
 const koopa=rows.find(o=>o.id===0)!;assert.equal(koopa.x,1075);assert.ok(Math.abs(koopa.x-1067)<=8); // appears at Mario's position, not at the 304 px spawn distance
 const main=area('8-2','main');
 assert.deepEqual(main.enemies.filter(e=>e.kind==='koopa'),[]);
 assert.deepEqual(main.enemies.filter(e=>e.kind==='paratroopa').map(e=>e.x).filter(x=>[1056,1104,1520,2720,2752].includes(x)),[1056,1104,1520,2720,2752]);
 // Native Goombas of the end stairs: x 2944 raw y 136 and x 2976 raw y 104 (row 70820 shows the first one with y 0x88 = 136)
 const first=objects('0100010101,060000000e,0000000100,0b0b0a0a0a,80a0a6ccda,88b0b8909f,017a').find(o=>o.id===6)!;
 assert.deepEqual([first.x,first.y],[2944,136]);
 assert.deepEqual(main.enemies.filter(e=>e.kind==='goomba'&&e.x>2900).map(e=>[e.x,e.y]),[[2944,160],[2976,128]]);
});

test('4-3, 5-3 and 7-1 keep only the native object of each screenshot sighting',()=>{
 // 4-3 row 34768: native id 3 at 624 (page 2, low 0x70), the id 15 Paratroopa at 576; no object at 592
 const n43=objects('0101010100,03030f0300,0400000100,0101020203,9fab407000,78782aa800,0170');
 assert.deepEqual(n43.filter(o=>o.id===3&&o.x>560).map(o=>o.x),[624]);
 assert.deepEqual(area('4-3','main').enemies.filter(e=>e.kind==='redKoopa'&&e.x>560&&e.x<640).map(e=>e.x),[624]);
 assert.deepEqual(area('5-3','main').enemies.filter(e=>e.kind==='redKoopa'&&e.x>1150&&e.x<1250),[]);
 assert.deepEqual(area('7-1','main').enemies.filter(e=>e.kind==='beetle'&&e.x>2600&&e.x<2720).map(e=>e.x),[2704]);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {whirlpoolAt,type WhirlpoolZone} from '../src/native-water.js';
import whirlpoolData from '../data/water-whirlpools.json';
import planVt from '../tools/fidelity-lab/water-plans/plan22-vt.json';
import planSw from '../tools/fidelity-lab/water-plans/plan22-sw.json';

// Area waterbig: the 5-2 pipe water room measured with SMALL and with BIG Mario (reference process: the recorded route to 5-2, a small beam search to the
// pipe, the mushroom of the screenshot-era 5-2 trace for big Mario, then tools/harness/ref-run.mjs --plan with the water-probe plans; findings in
// docs/NATIVE_ROLES.md (water: big Mario and the 5-2/6-2 room)). Rows below are native (x, y) per frame from the room entry; the remake feeds its controller input two steps
// earlier (its two-frame input queue), the convention under which the 2-2 route also lines up.

const keys=['up','down','left','right','a','b'] as const;
const buttons=(mask:number)=>keys.filter((_,bit)=>mask&(1<<bit));
const actions=(plan:{cases:{name:string;actions:number[][]}[]},name:string)=>plan.cases.find(c=>c.name===name)!.actions.flatMap(([mask,count])=>Array<number>(count).fill(mask));
/** The remake in the 5-2 water room, four native rows after the room load (the capture checkpoint), no enemies. */
function room(size:0|1|2){
 const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!);
 const main=level.areas.find(a=>a.id===level.main)!,pipe=main.pipes!.find(p=>p.to==='optional-water')!;
 main.spawn=[pipe.x-8,pipe.y];main.enemies=[];level.areas.find(a=>a.id==='optional-water')!.enemies=[];
 const sim=new Simulation([level]);sim.reset(true);sim.player.size=size;
 for(let f=0;f<400&&sim.area.id===main.id;f++)sim.step(['down'],1);
 assert.equal(sim.area.id,'optional-water');
 sim.step([],4);
 return sim;
}
const nativeY=(sim:Simulation)=>Math.floor(sim.player.y)-32;

// Native y per row (small and big Mario give identical rows) of the 5-2 room entry fall, the hold frame at native y 49, control, and a stroke every
// second frame from row 41 (plan22-vt case cad2): rows 5..215 after the room load.
const CAD2_Y:number[]=[
 0,0,1,1,2,3,4,5,6,7,8,9,11,12,14,16,17,19,21,23,25,28,30,33,36,39,42,45,49,49,52,56,60,64,69,73,77,81,85,90,
 88,87,85,84,82,81,79,78,76,75,73,72,70,69,67,66,64,63,61,60,58,57,55,54,52,51,49,48,46,45,43,42,40,39,37,36,34,33,31,30,
 28,27,25,24,22,21,19,18,18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,
 18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,
 18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,18,19,19,20,18,17,17,18,
 18,19,19,20,18,17,17,18,18,19,19,
];
// Native (x, y) of big Mario in the same room, plan22-sw case sweep-hold (A + B + right held after 40 idle rows): the entry fall, the first
// strokes and the walk through the first two whirlpool zones, rows 5..376 after the room load (the capture ends at the first hurt).
const HOLD_X:number[]=[
 24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,
 24,24,24,24,24,24,25,25,25,26,26,26,27,27,28,29,29,30,31,31,32,33,34,35,36,37,38,39,40,41,42,43,45,46,47,48,50,51,53,54,
 56,57,59,60,62,63,65,66,68,69,71,72,74,75,77,78,80,81,83,84,86,87,89,90,92,93,95,96,98,99,101,102,104,105,107,108,110,111,113,114,
 116,117,119,120,122,123,125,126,128,129,131,132,134,135,137,138,140,141,143,144,146,147,149,150,152,153,155,156,158,159,161,162,164,165,167,168,170,171,173,174,
 176,177,179,180,182,183,185,186,188,189,191,192,194,195,197,198,200,201,203,204,206,207,209,210,212,213,215,216,218,219,221,222,224,225,227,228,230,231,233,234,
 236,237,239,240,242,243,245,246,248,249,251,252,254,255,257,258,260,261,263,264,266,267,269,270,272,273,275,276,278,279,281,282,284,285,287,288,290,291,293,294,
 296,297,299,300,302,303,305,306,308,309,311,312,314,315,317,318,320,321,323,324,326,327,329,330,332,333,335,336,339,340,343,344,347,348,351,352,355,356,359,360,
 363,364,367,368,371,372,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,402,402,401,401,400,400,
 399,400,399,399,399,399,398,399,398,399,399,399,399,400,399,400,400,401,401,401,401,402,402,403,404,405,405,406,406,408,408,409,410,411,412,413,414,415,417,418,
 420,421,423,424,426,427,429,430,433,434,437,438,
];
const HOLD_Y:number[]=[
 0,0,1,1,2,3,4,5,6,7,8,9,11,12,14,16,17,19,21,23,25,28,30,33,36,39,42,45,49,49,52,56,60,64,69,73,77,81,85,90,
 88,87,85,84,83,81,80,79,78,77,76,75,74,73,72,72,71,70,70,69,69,68,68,67,67,66,66,66,66,66,65,65,65,65,65,65,65,65,66,66,
 64,63,61,60,59,57,56,55,54,53,52,51,50,49,48,48,47,46,46,45,45,44,44,43,43,42,42,42,42,42,41,41,41,41,41,41,41,41,42,42,
 40,39,37,36,35,33,32,31,30,29,28,27,26,25,24,24,23,22,22,21,21,20,20,19,19,19,18,18,18,18,19,19,19,20,20,21,21,22,23,24,
 22,21,19,18,17,15,14,13,12,12,11,10,10,9,9,9,9,9,9,9,9,10,10,11,11,12,13,14,15,16,17,18,20,21,22,24,26,27,29,31,
 29,28,26,25,24,22,21,20,19,18,17,16,15,15,14,13,13,13,13,13,13,13,13,13,13,14,14,15,16,17,18,19,20,21,22,23,25,26,28,29,
 27,26,24,23,22,20,19,18,17,16,15,14,14,13,13,12,12,12,12,12,12,12,12,12,13,13,14,16,17,20,22,25,28,30,32,34,37,40,42,44,
 42,40,38,37,35,34,33,32,31,31,30,30,30,30,30,31,31,32,33,34,36,38,39,41,44,46,49,51,54,56,59,61,64,67,70,72,74,76,79,82,
 80,78,76,75,73,72,71,70,69,69,68,68,68,68,68,69,69,70,71,72,74,76,77,79,82,84,87,89,92,94,97,99,102,105,108,110,112,114,116,117,
 115,114,112,111,110,108,107,106,104,102,100,99,
];

for(const size of [0,1] as const){
 test(`5-2 water room entry and strokes track the native rows exactly for ${size?'big':'small'} Mario (the 34-row 2-2 entry fall, no legacy fall)`,()=>{
  const sim=room(size),acts=actions(planVt,'cad2'),y:number[]=[];
  for(let i=1;i<=CAD2_Y.length;i++){sim.step(buttons(acts[i+1]??0),1);y.push(nativeY(sim));}
  assert.deepEqual(y,CAD2_Y);
 });
}

test('5-2 water room: big Mario holding A, B and right tracks the native x and y through the first two whirlpool zones',()=>{
 const sim=room(1),acts=actions(planSw,'sweep-hold'),x:number[]=[],y:number[]=[];
 for(let i=1;i<=HOLD_X.length;i++){sim.step(buttons(acts[i+1]??0),1);x.push(Math.floor(sim.player.x));y.push(nativeY(sim));}
 assert.deepEqual(x,HOLD_X);assert.deepEqual(y,HOLD_Y);
});

test('the 5-2 room has four whirlpool zones; each pulls toward its own centre (native pull flips at x 376)',()=>{
 const zones=(whirlpoolData.zones as Record<string,WhirlpoolZone[]>)['5-2/optional-water'];
 assert.deepEqual(zones.map(z=>[z.left,z.left+z.length]),[[336,416],[432,512],[592,640],[656,704]]);
 for(const x of [335,417,424,431,513,591,641,655,705])assert.equal(whirlpoolAt(zones,x),undefined,`x ${x}`);
 for(const x of [336,376,416,432,512,592,640,656,704])assert.ok(whirlpoolAt(zones,x),`x ${x}`);
});

test('a swimmer bumps its head at feet - ceiling <= 13 (small) or <= 29 (big): native y 93 / 109 under the row-6 bar (bottom edge 112) of the 5-2 room',()=>{
 for(const [size,bump] of [[0,93],[1,109],[2,109]] as const){
  const sim=room(size);sim.step([],60);
  sim.player.x=215;sim.player.y=131+32;sim.player.grounded=false;sim.seedSwim({speed:-2,force:0,frac:0,rise:10,fall:10,timer:32});
  const ys:number[]=[];for(let i=0;i<30;i++){sim.step([],1);ys.push(nativeY(sim));}
  assert.equal(Math.min(...ys),bump,`size ${size}`);
 }
});

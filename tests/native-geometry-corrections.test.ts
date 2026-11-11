import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Level geometry that native rows place elsewhere than the screenshot-extracted maps (data/native-geometry-corrections.json). Every excerpt is
// (x, native y) of the recorded winning route; native feet = y + 32, small Mario is 16 tall. The probes are the simulation's own: walls at x+12/x+2
// (the right wall edge is x+13: a player flush with a wall has x = wall - 13), feet at x+3/x+12, head at x+8.
function areaSim(levelId:string,areaId:string){
 const levels=structuredClone(observedLevels()),sim=new Simulation(levels);sim.reset(true);
 sim.levelIndex=levels.findIndex(l=>l.id===levelId);sim.loadArea(areaId,[40,208],0);
 return sim as any;
}
const bodyHits=(sim:any,[x,y]:[number,number])=>{
 const feet=y+32,hits:string[]=[];
 for(const py of [feet-12,feet-8])for(const px of [x+12,x+2])if(sim.collisionAt(px,py))hits.push(`wall ${px},${py}`);
 return hits;
};
const supported=(sim:any,x:number,feet:number)=>[x+3,x+12].some(px=>sim.collisionAt(px,feet)!==undefined);

test('4-2 area-3: the seven native plants (object x = pipe left + 8) sit on grid pipe tops, one tile left of the screenshot-era pipes',()=>{
 const area=observedLevels().find(l=>l.id==='4-2')!.areas.find(a=>a.id==='area-3')!;
 for(const x of [1160,1256,1352,1720,2216,2280,2888]){ // native id 13 object x (first appearances, rows 32041..32849)
  const left=(x-8)/16;
  assert.ok(area.enemies.some(e=>e.kind==='piranha'&&e.x===x),`plant ${x}`);
  const top=area.tiles.find(t=>t[0]===left&&t[2]===16);
  assert.ok(top,`pipe top at col ${left}`);
  assert.ok(area.tiles.some(t=>t[0]===left+1&&t[1]===top![1]&&t[2]===17),`right top at col ${left+1}`);
  assert.ok(area.tiles.some(t=>t[0]===left&&t[1]===top![1]+1&&t[2]===20),`body below col ${left}`);
 }
});

test('4-2 area-3: native Mario stands on the pipe at x 1248-1279 until x 1279 and the remake loses its support within 3 px of it',()=>{
 const sim=areaSim('4-2','area-3');
 // rows 32215..32231: landed at x 1267 (y 64 = feet 96), still on it at x 1279, first falling row x 1280; the old pipe top reached x 1295.
 for(const x of [1267,1270,1274,1276])assert.ok(supported(sim,x,96),`supported at ${x}`);
 for(const x of [1283,1286,1290,1293])assert.equal(supported(sim,x,96),false,`falling at ${x}`);
 // the falling rows pass the old right half of the pipe top and its body
 for(const p of [[1280,65],[1283,67],[1286,73],[1289,80],[1292,88]] as [number,number][])assert.deepEqual(bodyHits(sim,p),[],`row at ${p}`);
});

test('4-2 area-3: native Mario passes the hanging brick mass end (x 762-777) and the side-pipe mouth is a wall at x 2992',()=>{
 const sim=areaSim('4-2','area-3');
 // rows 31978..31986: rising past y 80..53 beside/under the old mass end (the row at x 762 still overlaps the new end by 1 px: edge slack)
 for(const p of [[757,80],[760,76],[765,69],[767,65],[770,62],[772,59],[775,56],[777,53]] as [number,number][])
  assert.deepEqual(bodyHits(sim,p),[],`mass row at ${p}`);
 // rows 33108-33114: jumping at x 2977 the player stays at x 2978-2979 below the pipe top (feet 128) and clears it above
 assert.ok(sim.collisionAt(2979+13,130),'mouth wall at feet 130');
 assert.equal(sim.collisionAt(2979+13,126),undefined,'above the mouth is open');
});

test('4-2 area-3: the lone brick at col 87 row 8 (free play explore-r4 4-2 mood6) stops a rising Mario and carries him at feet 128',()=>{
 const sim=areaSim('4-2','area-3');
 // row 709: rising at x 1379, y 104 (feet 136), speed 10296 -> 28: the wall probe x+13 meets col 87 at feet-8
 assert.ok(sim.collisionAt(1379+13,136-8),'brick side at feet 128');
 // rows 722-743: standing at y 96 (feet 128) from x 1382 to 1407; row 744 (x 1409) falls
 for(const x of [1382,1390,1399,1404])assert.ok(supported(sim,x,128),`supported at ${x}`);
 assert.equal(supported(sim,1409,128),false,'falls at 1409');
});

test('8-4 main: the 2-wide pipe at x 816 has its top at y 176 (native plant x 824, Mario stands at feet 176 and falls at x 847)',()=>{
 const level=observedLevels().find(l=>l.id==='8-4')!,area=level.areas.find(a=>a.id==='main')!;
 assert.ok(area.tiles.some(t=>t[0]===51&&t[1]===11&&t[2]===16)&&area.tiles.some(t=>t[0]===52&&t[1]===11&&t[2]===17));
 assert.equal(area.tiles.some(t=>t[1]===10&&t[0]>=51&&t[0]<=54),false);
 assert.equal(area.tiles.some(t=>t[0]>=53&&t[0]<=54&&t[1]>=11&&t[1]<=12),false);
 const sim=areaSim('8-4','main');
 // rows 75542..75575: standing at y 144 (feet 176) from x 827 to 846
 for(const x of [829,832,837,841])assert.ok(supported(sim,x,176),`supported at ${x}`); // native holds on to x 846; the remake's window ends at x 844 (edge slack, hidden walk-off state)
 for(const p of [[829,144],[837,144],[845,144]] as [number,number][])assert.deepEqual(bodyHits(sim,p),[],`stand ${p}`);
 // rows 75577..75585: falling from the pipe's right end through x 849-857 (feet 179-196), the old block's columns 53-54
 for(const p of [[849,147],[852,151],[854,156],[857,164]] as [number,number][])assert.deepEqual(bodyHits(sim,p),[],`fall ${p}`);
});

test('8-4 main: the pillar spans x 992-1055 and the beam at y 96 spans x 1216-1279 (native rows)',()=>{
 const sim=areaSim('8-4','main');
 // rows 75719..75740 and 75780..75789: standing at y 128 (feet 160) from x 990 to 1056, falling from x 1061 on
 for(const x of [990,996,1013,1028,1046,1052])assert.ok(supported(sim,x,160),`pillar support at ${x}`); // native holds on to x 1058; the remake's window ends at x 1052
 for(const p of [[1063,131],[1066,133],[1068,136]] as [number,number][])assert.deepEqual(bodyHits(sim,p),[],`pillar end fall ${p}`);
 // rows 75870..75895: rising and falling through y 76-118 at x 1198-1199 beside the beam's left end; rows 76014..76016 (x 1286-1290 are trace x + 1024): falling through its right end
 for(const p of [[1199,85],[1199,80],[1199,76],[1198,93],[1198,105],[1198,118]] as [number,number][])assert.deepEqual(bodyHits(sim,p),[],`beam left ${p}`);
 for(const p of [[1286,68],[1288,70],[1290,73]] as [number,number][])assert.deepEqual(bodyHits(sim,p),[],`beam right ${p}`);
 assert.ok(sim.collisionAt(1230,100),'the beam is still there between x 1216 and 1279');
});

test('8-3 main: the pipe at x 2688-2719 (native plant x 2696) lets native Mario fall through x 2717-2734, and the brick at (3056,144) is gone',()=>{
 const level=observedLevels().find(l=>l.id==='8-3')!,area=level.areas.find(a=>a.id==='main')!;
 assert.ok(area.enemies.some(e=>e.kind==='piranha'&&e.x===2696)&&!area.enemies.some(e=>e.kind==='piranha'&&e.x===2712));
 const sim=areaSim('8-3','main');
 // rows 73979..73986 (1 passage): falling x 2717-2734 at feet 161-189 beside the right end of the pipe (the old pipe reached x 2735)
 for(const p of [[2717,129],[2719,133],[2722,137],[2724,141],[2727,145],[2729,149],[2732,153],[2734,157]] as [number,number][]){
  assert.deepEqual(bodyHits(sim,p),[],`fall ${p}`);assert.equal(supported(sim,p[0],p[1]+32),false,`no support at ${p}`);
 }
 // rows 74115..74120 (1 passage): rising through the box x 3056-3071, y 144-159 with the speed byte unchanged
 for(const p of [[3057,140],[3059,136],[3062,133],[3064,129],[3067,126],[3069,123]] as [number,number][])assert.deepEqual(bodyHits(sim,p),[],`brick rise ${p}`);
});

test('8-4 main: the pipe at x 624-655 lets native Mario fall through x 662-674 (1 passage); its screenshot-era plant has no native slot',()=>{
 const level=observedLevels().find(l=>l.id==='8-4')!,area=level.areas.find(a=>a.id==='main')!;
 assert.equal(area.enemies.some(e=>e.kind==='piranha'&&(e.x===648||e.x===632)),false);
 const sim=areaSim('8-4','main');
 // rows 75439..75444: falling x 662-674 at feet 179-199; the old pipe (x 640-671) held the feet at y 176
 for(const p of [[662,147],[664,151],[667,155],[669,159],[672,163],[674,167]] as [number,number][]){
  assert.deepEqual(bodyHits(sim,p),[],`fall ${p}`);assert.equal(supported(sim,p[0],p[1]+32),false,`no support at ${p}`);
 }
 // Expectation changed 2026-11-11: the native collision map (RAM 0x500-0x69f) has no pipe at columns 39-40 at all, only the floor (y 208).
 assert.ok(!sim.collisionAt(630,180)&&sim.collisionAt(650,210),'no pipe at x 624-655, floor at y 208');
});

test('8-4 area-3 down pipe: native entry waits for Right to be released (rows 78104..78120: Down+Right held 14 rows on the pipe top, descent the row after)',()=>{
 const phaseAfter=(keys:string[])=>{
  const level=structuredClone(observedLevels().find(l=>l.id==='8-4')!),area=level.areas.find(a=>a.id==='area-3')!,pipe=area.pipes![0];
  level.main='area-3';area.spawn=[pipe.x-8,pipe.y];area.camera=Math.max(0,area.spawn[0]-112);
  const sim=new Simulation([level]);sim.reset(true);sim.step(keys as any,3);return sim.phase;
 };
 assert.equal(phaseAfter(['down','right']),'play');
 assert.equal(phaseAfter(['down','left']),'play');
 assert.equal(phaseAfter(['down']),'pipe');
});

test('1-2 area-2 x 1344-2575: plants, pipe top, brick ledges and the block end stand 16 px left of the screenshot-era map',()=>{
 const area=observedLevels().find(l=>l.id==='1-2')!.areas.find(a=>a.id==='area-2')!;
 for(const x of [1656,1752]){ // native id 13 object x (rows 3262 and 3301), pipe left = x - 8
  const left=(x-8)/16;
  assert.ok(area.enemies.some(e=>e.kind==='piranha'&&e.x===x),`plant spec ${x}`);
  assert.ok(area.tiles.some(t=>t[0]===left&&t[2]===16),`pipe top at col ${left}`);
 }
 const sim=areaSim('1-2','area-2');
 // rows 3437..3440 (x, y): standing on the second pipe top (feet 144) at x 1742-1747; the old pipe at 1760 needs x >= 1747 (x + 13 >= 1760)
 for(const x of [1742,1743,1745])assert.ok(sim.hasSupportAt(x,144),`supported at ${x}`);
 // rows 3523..3536: walking on the brick ledge (feet 160) from x 1947; the old ledge started at 1968
 for(const x of [1949,1952,1954,1960])assert.ok(sim.hasSupportAt(x,160),`ledge at ${x}`);
 // rows 3540..3543: falling past its right end (edge 1984; the old one reached 2000) at feet 164-172
 for(const p of [[1992,132],[1994,134],[1997,137],[1999,140]] as [number,number][])assert.deepEqual(bodyHits(sim,p),[],`fall ${p}`);
 // rows 3629..3631 and 3712..3715: rising/falling through the old bricks at (2208,144) and the right end of the block (2336-2431, y 128)
 for(const p of [[2214,114],[2217,115],[2219,118],[2422,98],[2424,99],[2427,102],[2429,104]] as [number,number][])assert.deepEqual(bodyHits(sim,p),[],`pass ${p}`);
});

test('1-2 area-2 end block: the exit pipe stands at x 2656 where native Mario stops, the warp plants at 2856/2920/2984 sit on pipes 16 px left of the screenshot-era map',()=>{
 const area=observedLevels().find(l=>l.id==='1-2')!.areas.find(a=>a.id==='area-2')!;
 const exit=area.pipes!.find(p=>p.to==='area-3')!;
 // rows 3800/3801: x 2642 (engine 8) -> 2644 (engine 2) = trigger 2643; rows 3822..3852: Mario stopped at x 2656 = trigger + 13, the same walk end as
 // 2-2 (3011 -> 3024), 4-2 (2979 -> 2992), 7-2 (3011 -> 3024) and 8-4 (1075 -> 1088); the screenshot-era pipe stood at 2672.
 assert.equal(exit.entryTriggerX,2643);assert.equal(exit.x,exit.entryTriggerX!+13);assert.equal(exit.x,2656);
 // the sideways pipe's mouth column (ids 28/31) and the vertical pipe above it (20/21) are on the same grid, one tile left of before
 for(const [col,row,id] of [[166,8,28],[166,9,31],[168,8,30],[168,3,20],[169,3,21]])assert.ok(area.tiles.some(t=>t[0]===col&&t[1]===row&&t[2]===id),`tile ${col},${row}`);
 assert.equal(area.tiles.some(t=>t[0]===167+16&&t[1]===8&&t[2]===28),false);
 // native id 13 object of the first warp pipe (slot 3 from row 3790, x page 0x0b low 0x28 = 2856) = pipe left 2848 + 8; the others follow 64 px apart
 for(const x of [2856,2920,2984]){
  const left=(x-8)/16;
  assert.ok(area.enemies.some(e=>e.kind==='piranha'&&e.x===x),`plant spec ${x}`);
  assert.ok(area.tiles.some(t=>t[0]===left&&t[1]===10&&t[2]===16),`warp pipe top at col ${left}`);
  assert.ok(area.pipes!.some(p=>p.requiresWarpActivation&&p.x===x-8+16),`warp pipe entry for ${x}`);
 }
 assert.equal(area.enemies.some(e=>e.kind==='piranha'&&[2872,2936,3000].includes(e.x)),false);
 // rows 3779..3800: native Mario walks on the end brick mass (feet 160, y 128) from his landing at x 2589 to the trigger at 2643
 const sim=areaSim('1-2','area-2');
 for(const x of [2589,2597,2612,2627,2642])assert.ok(supported(sim,x,160),`mass top at ${x}`);
});

test('6-1 main: native Mario lands at x 2170 and stands on floor (feet 208) from x 2172 to 2195 where the map had the floor start at 2208 (1 passage)',()=>{
 const sim=areaSim('6-1','main'); // rows 47668..47678: x 2170, 2172, 2175 ... 2195 at y 176 (feet 208)
 for(const x of [2170,2172,2175,2177,2180,2182,2185,2187,2190,2192,2195])assert.ok(sim.hasSupportAt(x,208),`floor under ${x}`);
 assert.equal(sim.hasSupportAt(2150,208),false,'the pit before it is unchanged (native is still above the floor line there)');
});

test('8-3 main: native Mario stands on floor (feet 208) at x 3319-3329 where the map had the floor start at 3344 (1 passage)',()=>{
 const sim=areaSim('8-3','main'); // rows 74220..74224: x 3319, 3322, 3324, 3327, 3329 at y 176
 for(const x of [3319,3322,3324,3327,3329])assert.ok(sim.hasSupportAt(x,208),`floor under ${x}`);
});

test('8-2 start: the first Paratroopa is the native object at x 288 (first row f69630: 261 at f69684, stomped at Mario x 232) and has no second sighting at 352',()=>{
 const xs=observedLevels().find(l=>l.id==='8-2')!.areas.find(a=>a.id==='main')!.enemies.filter(e=>e.kind==='paratroopa'&&e.x<900).map(e=>e.x).sort((a,b)=>a-b);
 assert.deepEqual(xs,[288,384]); // native id 14 before x 900: 288 (initial) and 384 (f69715)
});

test('8-4 area-2: the Buzzy Beetle pair is 32 px apart (native 209/241 after 30 rows of 0.5 px = spawn 224/256) and the second paratroopa is created at x 688',()=>{
 const area=observedLevels().find(l=>l.id==='8-4')!.areas.find(a=>a.id==='area-2')!;
 const beetles=area.enemies.filter(e=>e.kind==='beetle').map(e=>e.x).sort((a,b)=>a-b);
 assert.deepEqual(beetles,[224,256]); // native first row f76192: id 2 at x 209 and 241
 assert.deepEqual(area.enemies.filter(e=>e.kind==='paratroopa').map(e=>e.x).sort((a,b)=>a-b),[464,688,720]); // native id 14 first sightings f76325/76406/76420: x 464/688/720
});

test('1-4 main: hidden blocks (metatile 95, native collision map) at cols 106/109/112 row 9 and 107/110/113 row 5; native head bump under col 109 at x 1736',()=>{
 const sim=areaSim('1-4','main');
 for(const [col,row] of [[106,9],[109,9],[112,9],[107,5],[110,5],[113,5]])assert.equal(sim.tiles.get(`${col},${row}`),95,`${col},${row}`);
 // Model run mood0 native rows 760/761: x 1733 then 1736, feet 168, head probe x+8 = 1741 (col 108, empty) then 1744 (col 109), y 154 inside row 9 (144..159).
 assert.equal(sim.collisionAt(1741,154,true),undefined);
 assert.ok(sim.collisionAt(1744,154,true));
 assert.equal(sim.collisionAt(1744,154),undefined); // hidden: no side or landing contact
});

// Native collision map (RAM 0x500-0x69f of the winning-route trace, tools/harness/map-audit.mjs): cells small Mario stood on for 2-12 rows while the
// remake had no solid there (the native value is stable over the whole visit).
test('native collision map: cells Mario stood on are solid, the shifted 8-3 stair cell is not',()=>{
 const solidAt=(lv:string,c:number,r:number)=>areaSim(lv,'main').collisionAt(c*16+8,r*16+8)!==undefined;
 for(const [lv,c,r] of [['5-4',23,7],['5-4',103,11],['3-4',80,11],['6-4',30,10],['8-3',195,11],['8-3',202,7]] as [string,number,number][])
  assert.ok(solidAt(lv,c,r),`${lv} ${c},${r}`);
 assert.ok(!solidAt('8-3',203,7),'8-3 203,7 is empty natively (the stair cell is at 202)');
});

test('column drifts from the native collision map (RAM 0x500-0x69f, full route): 1-2 area-2 / 4-2 area-3 floor pits one column left, 6-4 walls one column right, 1-2 brick block at 84-89 unshifted',()=>{
 // native map excerpts (value != 0 = solid, each cell stable over 80+ route rows; tools/harness/map-audit.mjs --dump), remake row = native row + 2
 const cell=(lv:string,area:string,c:number,r:number)=>areaSim(lv,area).collisionAt(c*16+8,r*16+8)!==undefined;
 const expect=(lv:string,area:string,solid:number[][],empty:number[][])=>{
  for(const [c,r] of solid)assert.ok(cell(lv,area,c,r),`${lv} ${area} ${c},${r} solid`);
  for(const [c,r] of empty)assert.ok(!cell(lv,area,c,r),`${lv} ${area} ${c},${r} empty`);};
 // 1-2 area-2: block rows 7-8 at cols 84-89; pits 120-121, 124-125, 138-144, 153-159; staircase ends at col 137
 expect('1-2','area-2',[[84,7],[89,8],[119,13],[122,14],[126,13],[137,9],[145,13],[152,14]],[[83,7],[90,8],[120,13],[121,14],[125,13],[138,9],[138,12],[144,13],[153,14],[159,13]]);
 // 4-2 area-3: pits 57-62, 113-118, 123-128, 183-184; floor at 63, 119, 129, 185
 expect('4-2','area-3',[[56,13],[63,13],[119,13],[129,14],[185,13]],[[57,13],[62,14],[118,13],[123,13],[128,14],[183,13],[184,14]]);
 // 6-4: ceiling block ends at col 71, stubs at 80/88, floor block ends at 103, block 116-119
 expect('6-4','main',[[71,3],[71,5],[80,3],[88,3],[97,3],[103,4],[103,10],[103,12],[116,10],[119,12]],[[72,3],[79,3],[87,3],[104,10],[115,10]]);
 // 6-1 row 13: floor 167-173 and from 176, pit 174-175
 expect('6-1','main',[[167,13],[173,13],[176,13],[176,14]],[[166,13],[174,13],[175,14]]);
});

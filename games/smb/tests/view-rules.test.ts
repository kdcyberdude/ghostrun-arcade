import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waterSurfaceSky,doorwayBottomTile,titleBootColor,growCell,shrinkBig,fireFlashVariant,throwPoseShown,starVariant,rotatedPalette,bumpShown,liftRopeColumns} from '../src/view-rules.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import manifest from '../assets/graphics/graphics-manifest.json';
const raw=JSON.parse(readFileSync(new URL('../data/levels.json',import.meta.url),'utf8'));
const all=(raw.levels??raw) as any[];
const area=(level:string,id:string)=>{const a=all.find(l=>l.id===level).areas;return Array.isArray(a)?a.find((x:any)=>x.id===id):a[id];};
// Native 2-2 / 7-2 frames (shot-pairs, 12 rows after control): column x=3 is #6888fc for rows 0..32, then the wave, then #0058f8 water (7488 px differed before).
// Also native 8-4 area-4 (route frame 78197, native vs remake: 0 differing playfield px under the band).
test('water areas with the blue backdrop show sky in the HUD band; other themes do not',()=>{
 assert.ok(waterSurfaceSky(area('2-2','area-2')));assert.ok(waterSurfaceSky(area('7-2','area-4')));
 assert.ok(!waterSurfaceSky(area('1-1','main')));assert.ok(!waterSurfaceSky(area('1-2','main')));
});
// Native 2-1/2-3/4-1/5-3/8-3 start: the doorway columns (metatile 74) are black down to the ground (128 px per doorway differed before).
test('castle doorway lower half is filled with the black metatile only where the data has no tile',()=>{
 assert.equal(doorwayBottomTile(74,false),75);assert.equal(doorwayBottomTile(74,true),undefined);assert.equal(doorwayBottomTile(71,false),undefined);
 const tiles=new Map<string,number>(area('2-1','main').tiles.map(([x,y,id]:number[])=>[`${x},${y}`,id]));
 const filled=[...tiles].filter(([k,id])=>{const [x,y]=k.split(',').map(Number);return doorwayBottomTile(id,tiles.has(`${x},${y+1}`))!==undefined&&x<6;}).map(([k])=>k);
 assert.deepEqual(filled.sort(),['0,11','1,8','2,11','2,5','3,8','4,11']); // 2-1 s12 native vs remake: 0 differing px in these columns after the fill
});
// Native power-on frames (step index f = frame count f+1): 7c7c7c at f<=8, 000000 f9..f26, 6888fc f27..f31, title from f32 (remake matched native pixel for pixel at f5,8,9,26,27,31,32,33,45).
test('title boot sequence colours follow the native power-on frames',()=>{
 const at=(f:number)=>titleBootColor(f+1);
 assert.equal(at(0),'#7c7c7c');assert.equal(at(8),'#7c7c7c');assert.equal(at(9),'#000000');assert.equal(at(26),'#000000');
 assert.equal(at(27),'#6888fc');assert.equal(at(31),'#6888fc');assert.equal(at(32),undefined);assert.equal(at(45),undefined);
});
// Native 1-1 mushroom pickup, every frame of the freeze (A small, B mid, C big; 4-frame cells; first image row 375 = freeze row 1).
test('mushroom growth cells follow the native 4-frame sequence',()=>{
 const letter=(n:number)=>({23:'A',24:'B',25:'C'} as Record<number,string>)[growCell(n)!];
 let s='';for(let n=1;n<=46;n++)s+=letter(n);
 assert.equal(s,'AAAAAAAABBBBAAAABBBBAAAABBBBCCCCAAAABBBBCCCCAC');
 assert.equal(growCell(0),undefined);
});
// Native 1-1 shrink (engine 10 rows 568..622): sprite height alternates big/small each frame on image rows 569..583, then small.
test('shrink freeze flickers big/small each frame for 15 rows, then stays small',()=>{
 let s='';for(let n=1;n<=20;n++)s+=shrinkBig(n)?'B':'s';
 assert.equal(s,'BsBsBsBsBsBsBsBsssss');assert.ok(shrinkBig(0));
});
// Native 1-1 fire flower pickup (view5 capture, engine-12 rows 218..280, one PNG per row, palette by colour role in Mario's box):
// row 0 normal, row 1 fire, rows 2-4 dark (K o p), then 4-row cells fire (R c s) / green (G W s) / white (R W s) / dark, rows 61-63 white, fire after.
test('fire flower freeze palette follows the native 4-row cycle',()=>{
 const code={'fire':'F','star-dark':'D','star-green':'G','star-white':'W'} as Record<string,string>;
 let s='';for(let n=0;n<=63;n++)s+=code[fireFlashVariant(n)??'']??'.';
 assert.equal(s,'.FDDDFFFFGGGGWWWWDDDDFFFFGGGGWWWWDDDDFFFFGGGGWWWWDDDDFFFFGGGGWWW');
});
// Native fire Mario throws (view5 capture, fireball slot state 0x24/0x25 = 1 from row t): throw cell on rows t+1..t+3 on the ground at 1.5-1.7 px/frame
// (rows 290-292, 378-380, 394-396), t+1..t+6 starting from a stand (491-496), t+1..t+2 in the air (322-323). The remake showed it on ages 0..7.
test('fireball throw pose duration follows native rows',()=>{
 const rows=(g:boolean,v:number)=>Array.from({length:10},(_,a)=>throwPoseShown(a,g,v)?1:0).join('');
 assert.equal(rows(true,1.6),'0111000000');assert.equal(rows(true,0.2),'0111111000');assert.equal(rows(false,1.6),'0110000000');
});
test('Star drawing uses captured OAM palette bits, preserving the current player palette at zero',()=>{
 assert.deepEqual([0,1,2,3].map(p=>starVariant(p,'fire')),['fire','star-green','star-white','star-dark']);
 assert.equal(starVariant(0,'luigi'),'luigi');assert.equal(starVariant(0,'mario'),'mario');
});
// Native traces (all 32 levels): the ?-block colour is 27 27 27 17 07 17, one step per FrameCounter&7==0 engine frame; 1-1 entrance FC 157 offset 1, offset 2 from FC 160,
// 3 from 168, 4 from 176. Before: the remake never cycled (native-pixels.ts lag 1: 1-1 playfield 0.42% -> 0.00%, 1-3 HUD 0.33% -> 0.11%).
test('?-block palette cycle follows the native colour rotation',()=>{
 const palettes=manifest.palette_observations.map(o=>o.palette),entry=(i:number)=>palettes[i][13].toString(16).padStart(2,'0');
 assert.deepEqual(Array.from({length:9},(_,n)=>entry(rotatedPalette(palettes,0,n))),['27','27','27','27','17','07','17','27','27']);
 assert.deepEqual([0,4,5,6].map(n=>rotatedPalette(palettes,3,n)),[3,4,5,4]); // 1-2 underground triplet
 assert.equal(rotatedPalette(palettes,11,5),10); // castle atlas with the green-koopa sprite palette keeps its other entries
 const sim=new Simulation(observedLevels());sim.reset(true);sim.loadArea(sim.level.main);sim.phase='play';
 assert.equal(sim.colorRotations,0);sim.random.frame=157;sim.colorRotations=1;
 const seen:number[]=[];for(let f=158;f<=177;f++){sim.step([],1);assert.equal(sim.random.frame,f);seen.push(sim.colorRotations);}
 assert.deepEqual(seen,[1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,4,4]);
 sim.loadArea(sim.level.main);assert.equal(sim.colorRotations,0);
});
// native-pixels.ts lag 1, scroll-aligned playfield: 2-4 7.62% -> 1.03% (ceiling free tiles at x%16 6/14 and duplicates 1 px apart), 3-4 2.47 -> 0.89,
// 4-3 2.36 -> 0.90, 2-2 1.53 -> 0.45, 8-4 1.54 -> 0.36; no level worse.
// Free pieces and decorations are data on the 16-px metatile grid (tools/harness/native-level-map.ts --apply), so they are drawn as stored; the 2-4
// ceiling, once free pieces at x%16 6/14, is grid tiles read from the native block buffer.
test('free tile pieces are stored on the native 16-px metatile grid',()=>{
 for(const level of observedLevels())for(const a of level.areas)for(const t of [...a.freeTiles??[],...a.decorations??[],...a.hiddenFreeTiles??[]])
  assert.ok(t.x%16===0&&t.y%16===0,`${level.id} ${a.id} ${t.x},${t.y}`);
 const ceiling=area('2-4','main').tiles.filter((t:any)=>t[1]===3&&t[2]===98&&t[0]*16>500&&t[0]*16<1400).map((t:any)=>t[0]*16).sort((a:any,b:any)=>a-b) as number[];
 assert.equal(ceiling[0],544);assert.equal(ceiling.at(-1),1312);assert.ok(ceiling.every((x,i)=>i===0||x-ceiling[i-1]===16)); // one unbroken brick row, as natively
});
// Native 5-3 frame 420: the canopy cell over the trunk stays put when Mario's head hits it; bricks and ?-blocks still bounce.
test('only hit blocks are drawn bumped',()=>{
 for(const id of [81,85,94,95,96,192,193,196])assert.ok(bumpShown(id),String(id));
 for(const id of [22,23,24,76,98,16,20])assert.ok(!bumpShown(id),String(id));
});
// Native 2-4/5-4 pictures: rope columns 86 and 89 are rope from row 2 to row 14; the extracted 2-4 map misses rows 3-5 (2-4 1.03% -> 0.99%).
test('castle lift ropes span the playfield height',()=>{
 assert.deepEqual(liftRopeColumns(area('2-4','main')).sort(),[86,89]);assert.deepEqual(liftRopeColumns(area('5-4','main')).sort(),[86,89]);
 assert.deepEqual(liftRopeColumns(area('7-3','main')),[]); // not a castle
});

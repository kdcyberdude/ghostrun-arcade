import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waterSurfaceSky,doorwayBottomTile,titleBootColor,growCell,shrinkBig,fireFlashVariant,throwPoseShown,starVariant} from '../src/view-rules.js';
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
// Native 1-1 star on fire Mario (view5 capture rows 26..738, palette by colour role): F G W D in 2-row cells (rows 26..588), 8-row cells from the row
// the star timer 0x79F drops to 7 (589) to the last star row (738, 150 rows), own palette after. The remake cycled own/dark/white/green in 8/32-frame cells.
test('star palette cycle follows the native order and cell lengths',()=>{
 const code={fire:'F','star-green':'G','star-white':'W','star-dark':'D'} as Record<string,string>;
 const run=(left0:number,n:number,frame0:number)=>Array.from({length:n},(_,i)=>code[starVariant(left0-i,frame0+i,'fire')]).join('');
 assert.equal(run(600,16,0),'FFGGWWDDFFGGWWDD');
 assert.equal(run(150,34,0),'FFFFFFFFGGGGGGGGWWWWWWWWDDDDDDDDFF');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

test('8-4 tile (72,10) is not solid: native Mario crosses column 72 at feet 173..161 (rows 75822-75832) without a wall contact',()=>{
 const area=observedLevels().find(l=>l.id==='8-4')!.areas.find(a=>a.id==='main')!;
 assert.ok(!area.tiles.some(t=>t[0]===72&&t[1]===10));
 // Expectation changed 2026-11-11: the native collision map (RAM 0x500-0x69f) shows column 72 empty to the bottom (the 66-74 pit), not a pillar.
 for(const row of [11,12,13,14])assert.ok(!area.tiles.some(t=>t[0]===72&&t[1]===row),`column 72 is pit (72,${row})`);
 // native rows [row, x, y]: right edge x+13 inside column 72 (1152..1167) while the feet (y+32) are inside tile row 10 (160..175)
 const rows=[[75822,1139,141],[75823,1140,138],[75824,1142,135],[75825,1143,133],[75826,1145,130],[75827,1146,128],[75828,1148,126],[75829,1149,123],[75830,1151,121],[75831,1152,120],[75832,1154,118]];
 let overlapping=0;
 for(const [,x,y] of rows)if(x+13>=1152&&x+13<1168&&y+32>160&&y+32<176)overlapping++;
 assert.ok(overlapping>=5,'the native rows really overlap the removed tile box');
});

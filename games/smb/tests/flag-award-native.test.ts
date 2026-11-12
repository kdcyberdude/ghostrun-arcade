import {test} from 'node:test';
import assert from 'node:assert/strict';
import rules from '../data/flag-completion-rules.json' with {type: 'json'};

// Native: the flag award is a clean function of Mario's native y on the first slide row (engine 4; remake feet = y + 32). All 24 route grabs
// (score digits at row +62), [world-stage, y on the first slide row, award]. The remake's thresholds reproduce every one of them; the 3-2 / 5-2 mismatches
// in the campaign come from the remake touching the pole one frame earlier or later (x 2-3 px off), not from the table.
const NATIVE: [string, number, number][] = [
 ['1-1',148,100],['1-2',148,100],['1-3',151,100],['2-1',130,400],['2-2',112,400],['2-3',149,100],['3-1',151,100],['3-2',140,400],
 ['3-3',103,800],['4-1',31,5000],['4-2',75,2000],['4-3',96,800],['5-1',152,100],['5-2',144,100],['5-3',134,400],['6-1',152,100],
 ['6-2',17,5000],['6-3',98,800],['7-1',17,5000],['7-2',136,400],['7-3',149,100],['8-1',138,400],['8-2',122,400],['8-3',93,800],
];
test('flag award thresholds reproduce the 24 native route grabs',()=>{
 const award=(feet:number)=>rules.runtimeCandidates.scoreThresholds.find((t:{feetBelow:number})=>feet<t.feetBelow)?.score??rules.runtimeCandidates.lowestScore;
 for(const [level,y,score] of NATIVE)assert.equal(award(y+32),score,`${level} y ${y}`);
});

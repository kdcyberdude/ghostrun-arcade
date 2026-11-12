import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PlayerMotor} from '../src/native-player-motor.js';

// Native RAM traces of the 32-level route (one PPU frame per row; ghostrun-lab native_ram_trace.py): every frame where the native analyst
// found the remake's horizontal speed off by 1/16-px steps. Seed: the native bytes of the row before
// [$57*256+$0705, $0700, $33, $45, $0783, $0703, $0490&3]. Row: [pad (bit 0 A .. bit 7 Right), Player_State $1d at the frame start,
// previous A ($0d bit 7), $0490&3 after the row (a cleared bit is a side contact this row), then the native $57*256+$0705, $0700, $45, $33 after the row].
// Over all 32 traces this motor reproduces those bytes on 103,465 of 103,470 control rows (the 5 others are frozen end-of-level rows).
const WINDOWS:[string,number,number[],number[][]][]=[
 ['2-1',158,[400, 1, 1, 1, 10, 0, 3],[[130,0,0,3,628,2,1,1],[130,0,0,3,856,3,1,1],[129,0,0,3,1008,3,1,1],[131,1,1,3,1160,4,1,1],[129,1,1,3,1312,5,1,1],[131,1,1,3,1464,5,1,1],[128,1,1,3,1616,6,1,1],[130,1,0,3,1768,6,1,1]]],
 ['3-1',293,[0, 0, 2, 2, 0, 0, 3],[[2,0,0,3,0,0,2,2],[0,0,0,3,0,0,2,2],[2,0,0,3,0,0,2,2],[161,0,0,3,0,0,2,2],[163,1,1,3,152,0,2,2],[161,1,1,3,304,1,1,2],[163,1,1,3,608,2,1,2]]],
 ['3-4',164,[5124, 20, 1, 1, 0, 39, 3],[[66,0,0,3,4916,19,1,2],[66,0,0,3,4500,17,1,2],[66,0,0,3,4084,15,1,2],[66,0,0,3,3668,14,1,2],[66,0,0,3,3252,12,1,2],[66,0,0,3,2836,11,1,2],[66,0,0,3,2420,9,1,2],[66,0,0,3,-416,2,2,2],[98,0,0,3,-208,1,2,2],[98,0,0,3,-56,1,2,2],[98,0,0,3,96,0,2,2],[98,0,0,3,96,0,2,2],[130,0,0,3,152,0,2,1],[130,0,0,3,304,1,1,1],[130,0,0,3,532,2,1,1],[130,0,0,3,760,2,1,1]]],
 ['4-4',38,[6148, 24, 1, 1, 3, 0, 3],[[130,2,0,3,6300,24,1,1],[130,2,0,3,6196,24,1,1],[130,2,0,3,6348,24,1,1],[130,0,0,3,6576,25,1,1],[130,2,0,3,6804,26,1,1],[130,2,0,3,7032,27,1,1],[66,2,0,3,6804,26,1,1],[66,2,0,3,6576,25,1,1]]],
 ['5-1',288,[788, 3, 1, 1, 0, 40, 3],[[130,2,0,3,996,3,1,1],[130,2,0,3,1204,4,1,1],[130,2,0,2,132,5,1,1],[130,2,0,3,132,0,1,1],[130,0,0,3,360,1,1,1],[130,0,0,3,588,2,1,1],[130,0,0,3,816,3,1,1],[130,0,0,3,1044,4,1,1]]],
 ['6-1',207,[6720, 26, 1, 1, 9, 0, 3],[[130,0,0,3,6948,27,1,1],[128,0,0,2,8,28,1,1],[130,0,0,2,8,0,1,1],[128,0,0,3,8,0,1,1],[130,0,0,3,236,0,1,1],[80,0,0,3,-152,1,2,2],[82,0,0,3,-380,2,2,2],[80,0,0,3,-608,3,2,2]]],
 ['8-1',728,[7160, 27, 2, 1, 0, 29, 3],[[0,0,0,3,6744,26,1,2],[2,0,0,3,6328,24,1,2],[0,0,0,3,5912,23,1,2],[2,0,0,3,5496,21,1,2],[162,0,0,3,5080,19,1,2],[162,0,0,3,4776,18,1,2],[162,0,0,3,4472,17,1,2],[162,0,0,3,4168,16,1,2],[130,0,0,3,4624,18,1,1]]],
 ['8-2',119,[9568, 37, 1, 1, 0, 40, 3],[[83,1,0,3,9340,36,1,1],[82,1,1,3,9112,35,1,1],[82,1,0,3,8884,34,1,1],[82,0,0,3,8676,33,1,2],[82,0,0,2,68,32,1,2],[81,0,0,2,-388,2,2,2],[83,1,1,3,-596,3,2,2]]],
 ['8-4',600,[4224, 16, 2, 1, 0, 29, 3],[[65,0,1,3,3808,14,1,2],[65,0,1,3,3392,13,1,2],[65,0,1,3,2976,11,1,2],[65,0,1,3,2560,10,1,2],[128,0,1,3,2976,11,1,1],[128,0,0,3,3128,12,1,1],[128,0,0,3,3280,12,1,1],[128,0,0,3,3432,13,1,1],[144,0,0,3,3584,14,1,1],[144,0,0,3,3736,14,1,1]]],
];
// 2-1 f158: ground run steps with B (228), then the jump keeps stepping 152 in the air (absolute < 25). 3-1 f296: the jump row already steps in the air class (152).
// 3-4 f164: a doubled 416 brake, the stop at absolute 9 (MovingDir takes the facing, speed 0, then -416); Down+Left+B drops the press (friction 208, then 152).
// 4-4 f38: a walk-off at byte 24 accelerates to 27 in the air (air run class from absolute 25). 5-1 f288: air steps of 208 (RunningSpeed set), a wall contact keeps 132,
// the masked row holds it, the landing steps 228. 6-1 f207: a ground contact keeps 8, the masked press neither moves nor restarts, then 228 from 8; Left stops the residue and steps -152.
// 8-1 f728: neutral and Down+Right+B rows are friction rows, 416 (208 doubled while facing against the motion) until RunningSpeed clears, then 304; Right+B steps 456.
// 8-2 f119: the jump row after a contact reads the stale absolute 32 (run jump class) although the speed byte is 0, and its Left press steps -456 (the run air step 228, doubled).
// 8-4 f600: Left brakes 416 down to absolute 10; Right then steps 416 once (RunningSpeed set, still facing left) and 152 after the turn.
const bit=(pad:number,b:number)=>(pad>>b)&1;
for(const [level,first,seed,rows] of WINDOWS)test(`native speed bytes of ${level} rows ${first}..${first+rows.length-1}`,()=>{
 const m=new PlayerMotor();
 const [speed,absolute,facing,moving,runningTimer,runningSpeed,bits]=seed;
 m.reset(speed,facing===2?-1:1,moving===2?-1:moving===1?1:0,absolute);m.runningTimer=runningTimer;m.runningSpeed=runningSpeed;
 m.blockedRight=!(bits&1);m.blockedLeft=!(bits&2);
 rows.forEach(([pad,state,previousA,contact,...native],i)=>{
  const ground=state===0;
  m.step({direction:(bit(pad,7)-bit(pad,6)) as -1|0|1,ground,jump:ground&&bit(pad,0)===1&&previousA===0,b:bit(pad,1)===1,down:bit(pad,5)===1,buttons:(pad&0xfe)!==0});
  m.clearContacts();const byte=Math.floor(m.speed/256);
  if(!(contact&1))m.contact(1,byte>=0);
  if(!(contact&2))m.contact(-1,byte<=0);
  assert.deepEqual([m.speed,m.absolute,m.moving===-1?2:m.moving,m.facing===-1?2:1],native,`${level} row ${first+i}`);
 });
});

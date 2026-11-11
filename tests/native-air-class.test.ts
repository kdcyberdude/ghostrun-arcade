import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeMotor} from '../src/native-motor.js';

// Native rows from the retained model-play traces (evidence/local/model-play), speed in 1/4096 px per frame.
const facingRight=(speed:number)=>{const m=new NativeMotor();m.facing=1;m.moving=1;m.speed=speed;return m;};
const times=(n:number,step:()=>number)=>Array.from({length:n},step);

test('a run-class jump holds the run step and byte-40 cap in the air (worlds 1-2 mood5 rows 86-96)',()=>{
 const m=facingRight(10488);m.takeoff();
 assert.deepEqual(times(10,()=>m.air(1,true)),[10460,10432,10404,10376,10348,10320,10292,10264,10492,10464]);
});

test('takeoff below byte 29 leaves the 152 class after an air wall contact (worlds 2-1 mood5 row 462)',()=>{
 const m=facingRight(7140);
 assert.equal(m.groundPress(1,true,true),7368);m.takeoff();
 assert.equal(times(11,()=>m.air(1,true)).at(-1),9876);
 assert.equal(m.hitWall(9876+228,true,0,true),120);
 assert.deepEqual(times(3,()=>m.air(1,true)),[120,272,424]);
});

test('takeoff at byte 29 or more is the 208 class after an air wall contact (worlds 2-1 mood3 row 494)',()=>{
 const m=facingRight(8140);
 assert.equal(m.groundPress(1,true,true),8368);m.takeoff();
 assert.equal(times(7,()=>m.air(1,true)).at(-1),9964);
 assert.equal(m.hitWall(9964+228,true,0,true),208);
 m.air(1,true);m.freeze=1;m.air(1,true); // the native contact holds two rows; the simulation re-arms the pause
 assert.deepEqual(times(2,()=>m.air(1,true)),[416,624]);
});

test('a jump out of a fast-step coast is the 208 class, takeoff frame included (worlds 1-3 mood0 row 1967)',()=>{
 const m=facingRight(7276);
 assert.deepEqual(times(10,()=>m.groundCoast()),[7124,6916,6708,6500,6292,6084,5876,5668,5460,5252]);
 assert.equal(m.groundPress(1,true,true),5460);m.takeoff();
 assert.deepEqual(times(2,()=>m.air(1,true)),[5668,5876]);
});

test('a jump out of a fast-step brake takes the doubled 208 step on the takeoff frame (recorded route 1-2 f3401-3404)',()=>{
 const m=facingRight(3948);m.friction=208; // braking across the landing keeps the air class
 assert.deepEqual(times(2,()=>m.groundPress(-1,true)),[3740,3324]);
 assert.equal(m.groundPress(1,true,true),3740);
});

test('a jump accelerating through bytes 27-28 stays in the 152 class below byte 25 (live mood0 row 441 family)',()=>{
 const m=facingRight(7112);
 assert.equal(m.groundPress(1,true,true),7340);m.takeoff();
 assert.equal(m.airDrop,false);
});

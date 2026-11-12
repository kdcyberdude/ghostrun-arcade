import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeMotor} from '../src/native-motor.js';

// Native speed rows (signed speed byte * 256 + fraction) of the recorded winning route, jumps taken while the held direction opposes the
// speed (area `takeoff-reversal`). Row names are native trace rows; the input of a row decides that row's speed from 1-4 on.

const takeoffRows=(motor:NativeMotor,direction:1|-1,airFrames:number,running=true)=>{
 const speeds=[motor.groundPress(direction,running,true)];motor.takeoff();
 for(let i=0;i<airFrames;i++)speeds.push(motor.air(direction,running));
 return speeds;
};
const ground=(motor:NativeMotor,direction:1|-1,frames:number,running=true)=>Array.from({length:frames},()=>motor.groundPress(direction,running));

test('a left-moving takeoff out of a fresh reversal keeps decelerating below byte 11, then doubles after the zero crossing (3-1 row 21582, 5-1 row 38740)',()=>{
 const a=new NativeMotor();a.speed=-664;
 assert.deepEqual(ground(a,-1,3),[-892,-1120,-1348]);
 assert.deepEqual(takeoffRows(a,1,13),[-1196,-1044,-892,-740,-588,-436,-284,-132,20,172,324,628,932,1236]);
 const b=new NativeMotor();b.speed=-416;
 assert.deepEqual(ground(b,-1,1),[-644]);
 assert.deepEqual(takeoffRows(b,1,9),[-492,-340,-188,-36,116,268,572,876,1180,1484]);
});

test('a fresh reversal above byte 10 is unchanged: single steps in the air (8-4 row 77466)',()=>{
 const motor=new NativeMotor();motor.speed=-2240;
 assert.deepEqual(ground(motor,-1,2),[-2468,-2696]);
 assert.deepEqual(takeoffRows(motor,1,4),[-2544,-2392,-2240,-2088,-1936]);
});

test('a jump out of a skid keeps the doubled step until the speed byte reaches +1, then steps single (8-2 row 71914, 2-1 rows 10802 and 11193)',()=>{
 const a=new NativeMotor();a.speed=-3648;a.friction=152;a.skid=true;
 assert.deepEqual(ground(a,1,3),[-3344,-3040,-2736]);
 assert.deepEqual(takeoffRows(a,1,11),[-2432,-2128,-1824,-1520,-1216,-912,-608,-304,0,304,456,608]);
 // 2-1 11193: the takeoff frame is at byte -9 and does not turn the skid around.
 const b=new NativeMotor();b.speed=-3192;b.friction=152;b.skid=true;
 assert.deepEqual(ground(b,1,3),[-2888,-2584,-2280]);
 assert.deepEqual(takeoffRows(b,1,11),[-1976,-1672,-1368,-1064,-760,-456,-152,152,456,608,760,912]);
});

test('a right-moving jump out of a skid keeps the doubled step in the air (8-4 row 75858)',()=>{
 const motor=new NativeMotor();motor.speed=5328;motor.friction=152;motor.skid=true;
 assert.deepEqual(ground(motor,-1,1),[5024]);
 assert.deepEqual(takeoffRows(motor,-1,4),[4720,4416,4112,3808,3504]);
});

// Expectation changed on native evidence: this test used to read 2-1 row 10885 (1080 -> -96) and 8-1 row 68744 (1596 -> -92) as a turnaround at takeoff. Those two rows are wall contacts
// (x is pushed back 2 px on the row, the speed byte clears and the fraction stays); 100+ opposite-press takeoffs below byte 11 in the model-play traces never turn around.
test('a right-moving takeoff below byte 11 is an ordinary air step (model it000910 mood0 rows 12480, 12058); after a wall contact the air step doubles',()=>{
 const a=new NativeMotor();a.speed=1444;
 assert.deepEqual(ground(a,1,1),[1672]);
 assert.deepEqual(takeoffRows(a,-1,1),[1520,1368]);
 const b=new NativeMotor();b.speed=3040;
 assert.deepEqual(ground(b,1,1),[3268]);
 assert.deepEqual(ground(b,-1,2),[3116,2812]);
 assert.deepEqual(takeoffRows(b,-1,1),[2508,2204]);
 const wall=new NativeMotor();wall.facing=1;wall.moving=1;wall.speed=-96;wall.takeoff();
 assert.deepEqual([wall.air(-1,true),wall.air(-1,true)],[-400,-704]);
});

test('a plain takeoff along the motion is not affected by the skid state',()=>{
 const motor=new NativeMotor();motor.speed=3040;
 assert.deepEqual(ground(motor,1,1,false),[3192]);
 assert.deepEqual(takeoffRows(motor,1,2,false),[3344,3496,3648]);
});

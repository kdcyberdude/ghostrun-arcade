import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeMotor,byteOf,motionOf} from '../src/native-motor.js';

// Every sequence below is a short excerpt of read-only native speed measurements (signed speed byte * 256 + sub-byte
// fraction, 1/4096 px) retained under evidence/local/ and summarised in evidence/world11-motor-rewrite-findings-20261109.md.

const run=(motor:NativeMotor,steps:number,step:()=>number)=>Array.from({length:steps},step);

test('ground start from rest takes the doubled first step, then the run or walk step',()=>{
 const running=new NativeMotor();
 assert.deepEqual([running.groundPress(1,true),...run(running,3,()=>running.groundPress(1,true))],[304,532,760,988]);
 const walking=new NativeMotor();
 assert.deepEqual([walking.groundPress(1,false),...run(walking,3,()=>walking.groundPress(1,false))],[304,456,608,760]);
});

test('position advances by the speed byte only',()=>{
 assert.equal(byteOf(10260),40);assert.equal(motionOf(10260),2.5);
 assert.equal(byteOf(255),0);assert.equal(motionOf(255),0);
 assert.equal(byteOf(-100),-1);assert.equal(motionOf(-100),-1/16);
});

test('a run skid brakes at 208, doubles to 416, and the first press after it is doubled too',()=>{
 const motor=new NativeMotor();motor.speed=10256;
 assert.equal(motor.groundPress(1,true),10484);
 assert.equal(motor.groundPress(-1,true),10276,'first opposite frame is the fast friction step');
 assert.equal(motor.groundPress(-1,true),9860,'later frames double it');
 assert.equal(motor.groundPress(1,true,true),10316,'the takeoff frame after a skid accelerates at twice the run step, clamped to the cap byte');
});

test('a walking skid turns around at byte 10 and repeats the friction step once before the walk step',()=>{
 const motor=new NativeMotor();motor.speed=5984;motor.friction=208;motor.skid=true;
 const speeds=run(motor,8,()=>motor.groundPress(-1,false));
 assert.deepEqual(speeds,[5568,5152,4736,4320,3904,3488,3072,2656]);
 assert.deepEqual(run(motor,4,()=>motor.groundPress(-1,false)),[-416,-624,-776,-928]);
});

test('neutral coasting latches the fast friction step; holding B stops the player below byte 11',()=>{
 const motor=new NativeMotor();motor.speed=10416;
 assert.deepEqual(run(motor,3,()=>motor.groundCoast(false)),[10208,10000,9792]);
 const slow=new NativeMotor();slow.speed=2700;assert.equal(slow.groundCoast(true),0);
 const walk=new NativeMotor();walk.speed=6916;assert.deepEqual(run(walk,2,()=>walk.groundCoast(false)),[6764,6612]);
});

test('Down stops a small player below byte 11 unless pressing along the motion',()=>{
 const stopped=new NativeMotor();stopped.speed=2700;assert.equal(stopped.groundDown(0,true),0);
 const along=new NativeMotor();along.speed=2700;assert.equal(along.groundDown(1,true),2548);
 const fast=new NativeMotor();fast.speed=8284;assert.deepEqual(run(fast,2,()=>fast.groundDown(1,true)),[8076,7868]);
});

test('air from rest takes the doubled first step then the walk step; a run-class jump caps at the run byte keeping the fraction',()=>{
 const walk=new NativeMotor();walk.takeoff();
 assert.deepEqual(run(walk,3,()=>walk.air(1)),[304,456,608]);
 const fast=new NativeMotor();fast.speed=10252;fast.takeoff();
 assert.deepEqual(run(fast,4,()=>fast.air(1,true)),[10480,10452,10424,10396]);
});

// Native probes (F-entry-probe-2/3, area F): the contact timer and the along-motion pause last as long as the player is
// backed out of the wall (the contact frame plus one frame per pixel of back-out, input independent), not a function of the
// held buttons; the caller (simulation) re-arms `freeze` on every back-out frame.
test('a wall contact keeps only the fraction, pauses acceleration while backing out, then accelerates at 208 until the speed recovers',()=>{
 const motor=new NativeMotor();motor.speed=10396;motor.takeoff();
 const produced=motor.air(1,true);assert.equal(produced,10368);
 assert.equal(motor.hitWall(produced,true,0,true),128);
 // Air contact at run speed backed out for three frames (native probe: speed 232 held for contact + 3 rows).
 const paused=[motor.air(1,true)];motor.freeze=1;paused.push(motor.air(1,true));motor.freeze=1;paused.push(motor.air(1,true));
 assert.deepEqual(paused,[128,128,128]);
 assert.deepEqual(run(motor,3,()=>motor.air(1,true)),[336,544,752]);
});

// Native route rows 3-2 24429..24465 (wall contact on the takeoff row of a run-class jump): the speed byte is cleared, the fraction is
// held for the contact row plus one, then every air step is 208 (not 228, no recovery) and the cap is the walk byte until landing.
test('an air contact in a run-class jump keeps the 208 step and the walk cap until landing',()=>{
 const motor=new NativeMotor();motor.speed=10436;
 const produced=motor.groundPress(1,true,true);motor.takeoff();
 assert.equal(motor.hitWall(produced,true,0,true),168);
 const rows=run(motor,36,()=>motor.air(1,true));
 assert.deepEqual(rows.slice(0,6),[168,376,584,792,1000,1208]);
 assert.deepEqual(rows.slice(-7),[6200,6152,6360,6312,6264,6216,6168],'the cap clamps to byte 24 keeping the fraction');
});

// Native route rows 6-2 49029..49037 and 49184..49195: a jump inside the pause of a run-speed ground contact is the 208-step jump
// (the contact latched the run class); the same jump after a contact at a creeping speed is the 152-step walk jump.
test('a jump taken inside the pause of a run-speed ground contact steps 208, after a creeping contact 152',()=>{
 const run40=new NativeMotor();run40.speed=10148;
 assert.equal(run40.hitWall(run40.groundPress(1,true)),136);
 assert.equal(run40.groundPress(1,true,true),136,'the jump frame is still inside the pause');run40.takeoff();
 assert.deepEqual(run(run40,4,()=>run40.air(1,true)),[344,552,760,968]);
 const creep=new NativeMotor();creep.speed=1024;
 const produced=creep.groundPress(1,true,true);creep.takeoff();
 assert.equal(creep.hitWall(produced,true,0,true),152);
 assert.deepEqual(run(creep,5,()=>creep.air(1,true)),[152,304,456,608,760]);
 const later=new NativeMotor();later.speed=10148;later.hitWall(later.groundPress(1,true));later.groundPress(1,true);later.groundPress(1,true);later.takeoff();
 assert.equal(later.airDrop,false,'once the pause has ended the contact no longer decides the jump class');
});

// A walk-off after a real stay on the ground must not inherit the 208/walk-cap state of an earlier walled jump (route 1-2 row 3022:
// native keeps the run cap of byte 40).
test('a walk-off at run speed after a walled jump is a run-class air frame again',()=>{
 const motor=new NativeMotor();motor.speed=10436;motor.takeoff();
 motor.hitWall(motor.air(1,true),true,0,true);
 assert.equal(motor.airDrop,true);
 motor.speed=10240;run(motor,3,()=>motor.groundPress(1,true));
 assert.equal(byteOf(motor.air(1,true)),40);
});

test('a ground wall contact pauses one frame whatever buttons are held, and the restart below the walk step does not apply',()=>{
 for(const running of [true,false]){
  const motor=new NativeMotor();motor.speed=10200;
  assert.equal(motor.hitWall(10428),188);
  const kept=motor.speed;
  assert.equal(motor.groundPress(1,running,false),kept,'one paused frame');
  assert.equal(motor.groundPress(1,running,false),kept+(running?228:152),'then the plain step from the kept fraction');
 }
 const fraction=new NativeMotor();fraction.speed=132;fraction.hitWall(10400+228);fraction.freeze=0;
 assert.equal(fraction.groundPress(1,true),132+228,'native 132 -> 360 after a wall hit, not the 152 restart');
});

test('the wall pause elapses on neutral frames and never delays an opposite press',()=>{
 const neutral=new NativeMotor();neutral.speed=232;neutral.hitWall(10272+228);
 neutral.tickFreeze();assert.equal(neutral.freeze,0);
 const opposite=new NativeMotor();opposite.speed=10272;opposite.takeoff();opposite.hitWall(10500);
 assert.equal(opposite.air(-1,false),((10500%256)+256)%256-208,'native 232 -> 24: the opposite press acts in the pause frame');
});

test('braking a run-class jump uses the run step in the run band and 208 below it',()=>{
 const motor=new NativeMotor();motor.speed=7008;motor.airRun=true;motor.airDrop=true; // the 208 class now comes from the takeoff (byte >= 29 or a fast brake), which this excerpt starts after
 assert.deepEqual(run(motor,5,()=>motor.air(-1,true)),[6780,6552,6324,6116,5908]);
});

test('landing at run speed with only the walk step held drops to the walk cap at 208, twice, then walks at 152',()=>{
 const motor=new NativeMotor();motor.speed=10424;
 assert.deepEqual(run(motor,3,()=>motor.groundPress(1,false)),[6280,6232,6384]);
});

test('a jump immediately after the run-to-walk clamp keeps the 208 air step',()=>{
 // Native explore-r7 1-1/mood1 rows 1448..1454: landing 10400 -> 6256, then a jump at byte 24
 // keeps the clamp's 208 class throughout the air spell (also observed in 1-2/mood0 rows 125..128).
 const motor=new NativeMotor();motor.speed=6400;motor.takeoff();
 motor.speed=10400;
 assert.equal(motor.groundPress(1,false),6256);
 assert.equal(motor.groundPress(1,false,true),6208);
 motor.takeoff();
 assert.deepEqual(run(motor,5,()=>motor.air(1)),[6160,6368,6320,6272,6224]);
});

test('the clamp class survives a neutral takeoff until an air direction is pressed',()=>{
 // Native explore-r7 8-3/mood3 rows 3286..3302: A+B jumps without a direction; the first
 // Right press at row 3299 still steps 208, although B has been toggled during the jump.
 const motor=new NativeMotor();motor.speed=7796;
 assert.equal(motor.groundPress(1,false),6212);
 motor.takeoff();
 assert.deepEqual(run(motor,11,()=>motor.air(0)),Array(11).fill(6212));
 assert.deepEqual(run(motor,4,()=>motor.air(1)),[6164,6372,6324,6276]);
});

test('a walk-off at walk-cap speed after an earlier run jump keeps the walk cap in the air (native 1-3 rows 5381-5388)',()=>{
 // Native rows after the ledge at x 749 (no jump): the speed alternates +152 / -104 around byte 24 instead of accelerating on.
 const motor=new NativeMotor();motor.speed=10300;motor.takeoff(); // the previous jump was a run-class jump
 assert.equal(motor.airRun,true);
 motor.speed=6216;
 for(let i=0;i<4;i++)motor.groundPress(1,false);
 const speeds=run(motor,8,()=>motor.air(1,false));
 assert.ok(speeds.every(s=>byteOf(s)<=24+1),`walk-cap air speeds ${speeds}`);
 assert.ok(Math.max(...speeds)<6400+152);
});

test('an opposite press on a stationary positive sub-byte residue steps to -152 (native 2-1 f11155, f11005, 3-?: 72, 104, 140, 156, 204)',()=>{
 for(const residue of [72,104,140,156,204]){
  const motor=new NativeMotor();motor.speed=residue;
  assert.deepEqual([motor.groundPress(-1,false),motor.groundPress(-1,false),motor.groundPress(-1,false)],[-152,-304,-456],`residue ${residue}`);
 }
});

test('a ground wall contact at speed byte 25-28 leaves the next jump at the walk step; from byte 29 it is the 208 jump',()=>{
 // native free-play rows (r2 3-1 mood1, 5-1 mood6): contact at byte 25 then a jump steps 152 (fraction kept); contact at byte >= 29 steps 208 (1-1 mood4).
 const low=new NativeMotor();low.speed=6392;const kept=low.hitWall(low.groundPress(1,true));
 low.takeoff();low.air(1,true);assert.equal(low.air(1,true),kept+152);
 const fast=new NativeMotor();fast.speed=7656;const keptFast=fast.hitWall(fast.groundPress(1,true));
 fast.takeoff();fast.air(1,true);assert.equal(fast.air(1,true),keptFast+208);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeMotor} from '../src/native-motor.js';

// Native r3 2-1 mood3 rows 3832-3835: a left jump while facing right (B held, no direction) lands at -4976 and coasts
// -4672, -4368, -4064 (304 per frame, the doubled 152 friction); r3+r4 coast rows facing against the motion: about 250 such rows.
test('a neutral coast while facing against the motion doubles the friction step',()=>{
 const m=new NativeMotor();m.reset(0,1);
 m.speed=-4976;m.takeoff();m.air(0,true);
 const got=[m.groundCoast(true),m.groundCoast(true),m.groundCoast(true)];
 assert.deepEqual(got,[-4672,-4368,-4064]);
});

test('the same coast while facing along the motion keeps the plain step',()=>{
 const m=new NativeMotor();m.reset(0,-1);
 m.speed=-4976;m.takeoff();m.air(0,true);
 const got=[m.groundCoast(true),m.groundCoast(true)];
 assert.deepEqual(got.map((s,k)=>s-(k?got[k-1]:-4976)),[152,152]);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import excerpts from './fixtures/native-ground-clamp.json';
import {NativeMotor} from '../src/native-motor.js';

// Grounded right presses without A/B/Down; native y, vertical fraction and support remain flat.
for(const row of excerpts)test(`native clamp continuation: ${row.source} row${row.frame}`,()=>{
 const motor=new NativeMotor();motor.reset(row.speeds[0],1);motor.moving=1;
 // Carry the clamp's class latch, then teacher-force its measured residue: the preceding skid history is absent here.
 motor.groundPress(1,false);motor.speed=row.speeds[1];
 assert.equal(motor.groundPress(1,false),row.speeds[2]);
});

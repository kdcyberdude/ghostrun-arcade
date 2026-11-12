import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trainerPadToMask} from '../tools/harness/model-play.mjs';

test('saved trainer pads preserve all eight named buttons, including start and select',()=>{
 // External eval format is A,B,select,start,up,down,left,right.
 assert.deepEqual(Array.from({length:8},(_,bit)=>trainerPadToMask(1<<bit)),[16,32,128,64,1,2,4,8]);
 assert.equal(trainerPadToMask(0x93),57); // A+B+up+right: dropout is already applied in the recording.
 assert.equal(trainerPadToMask(0),0);assert.equal(trainerPadToMask(255),255);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCoverage} from '../tools/visual3d/mood-equivalence-coverage.js';
test('authentic mood control/gameplay clips leave seed and initializer rows explicit',()=>{
 // 3d43b7... entry0: native load62, control63..213, supported gameplay seed215, inputs216..678.
 const c=sourceCoverage(62,679,[{sourceFrameOffset:63,frames:151},{sourceFrameOffset:216,frames:463}]);
 assert.equal(c.comparedFrames,614);assert.deepEqual(c.uncomparedRanges,[{start:62,end:63},{start:214,end:216}]);
});
test('overlapping renderer clips do not double-count source coverage',()=>{
 const c=sourceCoverage(0,20,[{sourceFrameOffset:5,frames:10},{sourceFrameOffset:0,frames:10},{sourceFrameOffset:15,frames:3}]);
 assert.equal(c.comparedFrames,18);assert.deepEqual(c.comparedRanges,[{start:0,end:18}]);assert.deepEqual(c.uncomparedRanges,[{start:18,end:20}]);
 assert.throws(()=>sourceCoverage(0,20,[{sourceFrameOffset:19,frames:2}]),/exceeds/);
});

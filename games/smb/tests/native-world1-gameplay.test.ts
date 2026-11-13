import {test} from 'node:test';import assert from 'node:assert/strict';
import {world11Epochs} from '../tools/harness/native-world1-gameplay.js';
test('World1-1 diagnostic accounting retains boot, death, respawn, bonus and flag spans while cutting the next world',()=>{
 const rows=[{mode:0,task:0,engine:0},{mode:1,task:1,engine:0},{mode:1,task:3,engine:7},{mode:1,task:3,engine:8},{mode:1,task:3,engine:11},{mode:1,task:0,engine:0},{mode:1,task:1,engine:0},{mode:1,task:3,engine:8},{mode:1,task:3,engine:3},{mode:1,task:0,engine:0},{mode:1,task:1,engine:0},{mode:1,task:3,engine:8},{mode:1,task:3,engine:5},{mode:1,task:3,engine:8,level:1}];
 const ram=new Uint8Array(rows.length*2048);rows.forEach((r,f)=>{ram[f*2048+0x770]=r.mode;ram[f*2048+0x772]=r.task;ram[f*2048+14]=r.engine;ram[f*2048+0x75c]=r.level??0;});
 const report=world11Epochs(ram);assert.equal(report.frames,13);assert.deepEqual(report.epochs,[{index:0,from:1,to:6},{index:1,from:6,to:10},{index:2,from:10,to:13}]);
 assert.deepEqual(report.spans.flatMap(s=>Array.from({length:s.to-s.from},(_,i)=>s.from+i)),Array.from({length:13},(_,i)=>i));
 assert.ok(report.spans.some(s=>s.engine===11));assert.ok(report.spans.some(s=>s.engine===5));
});
test('diagnostic frame accounting rejects truncated native RAM rows',()=>{assert.throws(()=>world11Epochs(new Uint8Array(2049)),/whole PPU rows/);});

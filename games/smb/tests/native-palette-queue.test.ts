import {test} from 'node:test';import assert from 'node:assert/strict';
import {NativePalette} from '../src/native-palette.js';import data from './fixtures/native-palette-queue.json';
test('area parser selects native VRAM buffer2 and delays the queued palette',()=>{
 assert.ok(data.checked>10000);
 for(const e of data.events){const p=new NativePalette();p.reset(e.scroll,e.task,3);const selected=p.step(e.delta,4,e.remove);assert.deepEqual([p.scroll,p.task,selected],e.after,`${e.level}:${e.frame}`);assert.equal(p.draw,selected?3:4);}
});

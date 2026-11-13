import {test} from 'node:test';import assert from 'node:assert/strict';
import {nativeWarpZoneRelease} from '../src/native-frenzy-controllers.js';
import events from './fixtures/native-warp-zone-events.json';
test('native WarpZoneObject bytewise Y and ScrollLock test matches every sampled slot lifetime row',()=>{
 assert.ok(events.length>100);assert.ok(events.some(e=>e.released));
 for(const e of events)assert.equal(nativeWarpZoneRelease(e.locked,e.y,e.page),e.released,`${e.level} row${e.frame} slot${e.slot}`);
});

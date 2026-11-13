import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {nativeEntities,NATIVE_ENEMY_KIND} from '../tools/harness/native-entities.js';import fixture from './fixtures/native-cannon-five-two-window.json';
test('legacy native enemy comparison includes genuine ID51 cannon shots',()=>{
 const ram=new Uint8Array(gunzipSync(Buffer.from(fixture.snapshot.ram,'base64'))),row=fixture.rows.find(r=>r.frame===fixture.snapshot.frame)!;
 assert.equal(NATIVE_ENEMY_KIND[51],'bullet');assert.ok(row.cannons.length>0);
 for(const shot of row.cannons){assert.equal(ram[0x16+shot.slot],51);assert.ok(nativeEntities(ram).some(e=>e.kind==='bullet'&&e.x===Math.floor(shot.x)&&e.y===(shot.y-24&255)));}
});

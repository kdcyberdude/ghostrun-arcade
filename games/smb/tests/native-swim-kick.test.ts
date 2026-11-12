import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeSwimKick} from '../src/player-cell.js';
import tables from '../assets/graphics/tables.json';
import fixture from './fixtures/native-swim-kick.json';

test('native swimming foot uses FrameCounter bit2 and leaves the third small swimming cell intact',()=>{
 assert.ok(fixture.checked>5000);
 for(const level of fixture.levels)for(const [frame,cell,counter,tile] of level.rows){
  assert.equal(nativeSwimKick(cell,counter)??tables.player_cells[cell].tiles[6],tile,`${level.level} native frame ${frame}`);
 }
 assert.equal(nativeSwimKick(5,0),0x31,'the native big-Mario kick tile');
 assert.equal(nativeSwimKick(19,0),undefined,'SwimTileRepOffset prevents replacing small frame3');
});

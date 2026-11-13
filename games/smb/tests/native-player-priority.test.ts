import {test} from 'node:test';import assert from 'node:assert/strict';import {nativePlayerPriorityCleared} from '../src/native-player-priority.js';import data from './fixtures/native-player-priority.json';
test('native controller priority clear agrees with stored and drawn RAM across pipe/flag/player actions',()=>{
 assert.ok(data.checked>1000);for(const row of data.rows){const [level,frame,engine,y,stored,drawn]=row as [string,number,number,number,boolean,boolean];assert.equal(!nativePlayerPriorityCleared(engine,y),stored,`${level} frame${frame} stored priority`);assert.equal(drawn,stored,`${level} frame${frame} drawn priority`);}
});

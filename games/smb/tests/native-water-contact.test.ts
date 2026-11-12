import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeWaterEnemyHit} from '../src/native-water-contact.js';
import events from './fixtures/native-water-rule-events.json';

test('native underwater control9 boxes match observed even-frame player/enemy rectangles',()=>{
 let hits=0;assert.ok(events.waterContacts.length>1000);
 for(const [level,row,slot,x,y,big,duck,ex,ey,hit] of events.waterContacts as [string,number,number,number,number,boolean,boolean,number,number,boolean][]){
  assert.equal(nativeWaterEnemyHit({x,y,big,duck},{x:ex,y:ey}),hit,`${level} row ${row} slot ${slot}`);if(hit)hits++;
 }
 assert.ok(hits>0);
});

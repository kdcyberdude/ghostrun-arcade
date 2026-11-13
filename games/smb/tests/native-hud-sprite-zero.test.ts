import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameRenderer} from '../src/renderer.js';
import fixture from './fixtures/native-hud-sprite-zero.json';

test('InitializeGame installs the HUD sprite zero before intro control reaches GameEngine',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;
 renderer.text=()=>{};renderer.quad=()=>{};renderer.rotation=(p:number)=>p;renderer.hudCoinTextures=['coin'];
 for(const row of fixture.rows){
  const sprites:number[][]=[];renderer.spriteTile=(tile:number,x:number,y:number)=>sprites.push([y-1,tile,35,x]);
  renderer.hud({phase:'intro',nativeScreen:{task:row.task,engine:row.engine,screen:row.screen},currentPlayer:0,hud:{draw:{score:'000100',coins:'00',time:'   '}},area:{palette:0},level:{id:fixture.level}});
  assert.deepEqual(sprites,row.task===3?[row.oam]:[],`native RAM/OAM frame ${row.frame}`);
  if(row.task===2)assert.equal(row.oam[0],248);
 }
});

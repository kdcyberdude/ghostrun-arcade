import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {NativeCastlePictures} from '../src/native-castle-picture.js';import {NativeParserClock} from '../src/native-parser-clock.js';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
import {GameRenderer} from '../src/renderer.js';
import {initializeEntrance} from '../tools/harness/native-entrance.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-castle-pictures.json',import.meta.url),'utf8'));
const victory=JSON.parse(readFileSync(new URL('./fixtures/native-victory-events.json',import.meta.url),'utf8'));
const keys=['a','b','select','start','up','down','left','right'] as const;
for(const run of fixture.runs){
 test(`${run.level}: source retainer loading and post-scroll parser state match every native victory row`,()=>{
  const ram=Buffer.from(run.ram,'base64'),parser=new NativeParserClock(ram[0x71f],ram[0x73d]),picture=new NativeCastlePictures(run.level,'main');picture.begin();assert.equal(run.rows[0].spriteCount,0);
  for(let i=1;i<run.rows.length;i++){const row=run.rows[i],previous=run.rows[i-1];if(row.camera!==previous.camera)parser.advance(row.camera-previous.camera,false);
   assert.deepEqual([parser.task,parser.scroll],row.parser,`parser ${row.frame}`);picture.step(row.task,row.camera,parser.blocked,previous.slot0[0]===0);
   const active=row.slot0[0]===1&&row.slot0[1]===53;assert.equal(Boolean(picture.retainer),active,`birth ${row.frame}`);
   if(active){assert.deepEqual([picture.retainer!.x,picture.retainer!.y,picture.retainer!.slot],[row.slot0[2],row.slot0[3],0]);assert.equal(picture.retainer!.graphicsVisible,previous.slot0[0]===1&&previous.slot0[1]===53&&row.task!==0);if(row.npc.length)assert.equal(picture.retainer!.graphicsVisible,true);}
  }
 });
 test(`${run.level}: actual native PPU retainer pixels uniquely match the previous RAM OAM row`,()=>{
  assert.ok(run.timing[1].checked>1000);assert.equal(run.timing[1].different,0);assert.ok(run.timing[0].different>0);assert.ok(run.timing[2].different>0);
 });
 const original=victory.runtime.find((r:any)=>r.level===run.level);if(!original.full)continue;
 test(`${run.level}: continuous original entrance replay owns blank axe and native retainer pictures`,()=>{
  const s:any=new Simulation(observedLevels());s.reset(true);initializeEntrance(s,original.full.entrance);s.step([],0);s.inputs=[];
  for(const pad of original.full.pads)s.step(keys.filter((_,i)=>pad&(1<<i)),1);
  assert.equal(s.spritePictureOwner,'empty');assert.equal(s.castleRetainer,undefined);
  for(let i=1;i<run.rows.length;i++){const row=run.rows[i],previous=run.rows[i-1];s.step([],1);assert.equal(s.spritePictureOwner,'victory');assert.equal(s.camera,row.camera,`camera ${row.frame}`);assert.equal(s.colorRotations%6,row.rotation,`ColorRotateOffset ${row.frame}`);for(const object of s.areaControls.castleGraphics)assert.equal(s.blockBackground.get(`${object.column},${object.row}`),row.bridge>object.erase?null:object.id,`queued castle BG ${row.frame}/${object.erase}`);assert.deepEqual([s.parserClock.task,s.parserClock.scroll],row.parser,`parser ${row.frame}`);
   const write=original.rows.find((r:any)=>r.frame===row.frame)?.write;if(write===0)assert.ok(s.castleText.some((r:any)=>r.text==='THANK YOU MARIO!'),`queued VRAM text ${row.frame}`);
   const active=row.slot0[0]===1&&row.slot0[1]===53;assert.equal(Boolean(s.castleRetainer),active,`retainer birth ${row.frame}`);if(active){assert.deepEqual([s.castleRetainer.x,s.castleRetainer.y],[row.slot0[2],row.slot0[3]]);assert.equal(s.castleRetainer.graphicsVisible,previous.slot0[0]===1&&previous.slot0[1]===53);}
  }
 });
}

test('Bowser halves use native OAM cell, position and horizontal orientation on every visible victory row',()=>{
 let checked=0;for(const run of fixture.runs)for(const row of run.rows){if(!row.boss?.sprites.length)continue;const b=row.boss,right=Boolean(b.direction&1),actual:any[]=[];
  const renderer=Object.create(GameRenderer.prototype);renderer.spriteTile=(tile:number,x:number,y:number,palette:string,flipX:boolean,flipY:boolean)=>{if(tile!==252&&y-1<240&&y>0&&x>=0&&x<256)actual.push({x,y:y-1,tile,attributes:(flipX?64:0)|(flipY?128:0)});};
  const enemy:any={kind:'bowser',x:b.x-(right?16:0),y:b.y+32,vx:right?1:-1,dead:0,age:0,bowser:{side:right?1:-1},nativeBowser:{controls:b.controls}};
  renderer.enemy(enemy,{level:{id:run.level},area:{id:'main'},camera:row.camera,random:{frame:0},castleBowserFalls:()=>Boolean(b.state&64)});
  const order=(a:any,b:any)=>a.y-b.y||a.x-b.x||a.tile-b.tile;assert.deepEqual(actual.sort(order),row.boss.sprites.map((s:any)=>({...s,attributes:s.attributes&192})).sort(order),`${run.level}:${row.frame}`);checked++;
 }
 assert.ok(checked>100);
});

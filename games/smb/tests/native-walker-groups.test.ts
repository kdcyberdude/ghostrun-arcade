import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {EnemySpec,Level,Tile} from '../src/types.js';
import layouts from '../data/native-walker-groups.json';
import {applyNativeWalkerGroups} from '../tools/native-walker-groups.mjs';
import births from './fixtures/native-walker-group-events.json';

function fixture(column:number,count:number,kind:'goomba'|'koopa',y=208){
 const enemies:EnemySpec[]=Array.from({length:count},(_,index)=>({kind,x:column-48+24*index,y,nativeGroup:{column,index,count}}));
 const area={id:'main',width:8192,palette:0,theme:'ground' as const,tiles:Array.from({length:512},(_,x)=>[x,y/16,84] as Tile),enemies,spawn:[40,208] as [number,number],evidence:'Native group slot/column fixture'};
 const sim:any=new Simulation([{id:'fixture',time:400,main:'main',areas:[area],evidence:'Native group byte rules'} as Level]);sim.reset(true);return sim;
}

test('every raw native group has its full potential member count in compiled levels',()=>{
 assert.ok(layouts.length>=10);
 for(const layout of layouts){
  const area=observedLevels().find(l=>l.id===layout.level)!.areas.find(a=>a.id===layout.area)!;
  for(const group of layout.groups){
   const members=area.enemies.filter(e=>e.nativeGroup?.column===group.column);
   assert.deepEqual(members.map(e=>e.nativeGroup!.index).sort(),Array.from({length:group.count},(_,i)=>i),`${layout.level} ${group.column}`);
  }
 }
});

test('native groups reproduce every supported recorded birth, including lower-slot reuse and same-frame higher-slot movement',()=>{
 assert.ok(births.length>20);
 for(const event of births){
  const sim=fixture(event.column,event.count,event.kind as 'goomba'|'koopa',event.y);
  sim.camera=event.camera;sim.groupParserSlot=event.parserSlot;sim.slotSub=[...event.sub];sim.groupSlotsBefore=[...event.before];
  for(const slot of event.occupied)sim.enemies.push({...sim.makeEnemy({kind:'goomba',x:0,y:208}),active:true,enemySlot:slot});
  sim.passNativeGroups();
  const born=sim.enemies.filter((e:any)=>e.nativeGroup&&e.active).sort((a:any,b:any)=>a.nativeGroup.index-b.nativeGroup.index).map((e:any)=>({slot:e.enemySlot,x:e.x,y:e.y}));
  assert.deepEqual(born,event.born,`${event.level} row${event.row}`);
 }
});

test('a group waits for a slot but is skipped after its native column passes ScreenRight',()=>{
 const sim=fixture(528,3,'goomba');sim.camera=250;sim.groupParserSlot=5;sim.passNativeGroups();
 assert.ok(sim.enemies.every((e:any)=>!e.active));
 sim.camera=274;sim.groupParserSlot=0;sim.passNativeGroups();
 assert.ok(sim.enemies.every((e:any)=>!e.active&&e.slotLost));
});

test('native placed objects already behind ScreenRight do not steal slots after an area return',()=>{
 const sim=fixture(1600,2,'goomba');sim.camera=1280;
 const e=sim.makeEnemy({kind:'goomba',x:1280,y:80,nativeColumn:1280,spawnCamera:977});sim.enemies.push(e);sim.updateEnemies(sim.player.y);
 assert.equal(e.active,false);assert.equal(e.slotLost,true);assert.equal(e.enemySlot,undefined);
});


test('native group enrichment is repeatable without duplicate actors',()=>{
 const levels=structuredClone(observedLevels()),before=levels.map(l=>l.areas.map(a=>a.enemies.length));
 applyNativeWalkerGroups(levels,layouts);
 assert.deepEqual(levels.map(l=>l.areas.map(a=>a.enemies.length)),before);
});

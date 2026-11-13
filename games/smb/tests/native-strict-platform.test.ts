import {test} from 'node:test';import assert from 'node:assert/strict';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences,strictSimCoverage} from '../tools/harness/native-strict-entities.js';
import {observedLevels} from '../src/levels.js';
import {PlatformMotion,nativePlatformObject} from '../src/platform-motion.js';
import fixture from './fixtures/native-strict-platforms.json';
const kinds:Record<number,string>={36:'balance-platform',37:'vertical-platform',38:'up-lift',39:'down-lift',40:'horizontal-platform',41:'falling-platform',42:'right-platform',43:'small-up-lift',44:'small-down-lift'};
test('native platform readout includes birth rows, enemy slots, raw anchors and vertical pages from retained RAM',()=>{
 assert.ok(fixture.events.length>200);
 for(const event of fixture.events){
  const [level,frame,slot,flag,id,xLow,xPage,yLow,yPage,state]=event as [string,number,number,number,number,number,number,number,number,number];
  const r=new Uint8Array(2048);for(const [address,value] of [[0xf,flag],[0x16,id],[0x87,xLow],[0x6e,xPage],[0xcf,yLow],[0xb6,yPage],[0x1e,state]])r[address+slot]=value;
  const out=strictNativeEntities(r,-256);assert.equal(out.gaps.length,0,`${level} row${frame}`);
  assert.deepEqual(out.entities,[{bank:'enemy',slot,kind:kinds[id],x:xPage*256+xLow-256,y:(yPage-1)*256+yLow,source:'platform',state}],`${level} row${frame}`);
 }
});
test('all nine native platform IDs are comparable instead of unsupported coverage gaps',()=>{
 for(let id=36;id<=44;id++){const r=new Uint8Array(2048);r[0xf]=1;r[0x16]=id;r[0xb6]=1;assert.equal(strictNativeEntities(r).entities[0].kind,kinds[id]);}
});
test('simulation platform readout uses only assigned slots and current raw collision anchors',()=>{
 const level=observedLevels().find(l=>l.id==='1-3')!,area=level.areas.find(a=>a.id==='main')!,context={levelId:level.id,areaId:area.id};
 const platform=area.platforms!.find(p=>nativePlatformObject(p,context)?.kind==='lift')!,object=nativePlatformObject(platform,context)!;
 const motion=new PlatformMotion(context);motion.advance(0,object.spawnCamera,0);motion.create(platform,0);
 const sim={level,area,enemies:[],items:[],platformMotion:motion,platformFrame:0,platformSlots:new Map([[platform,2]])};
 // The engine queries held platform anchors while assigning their slots.
 motion.collisionPosition(platform,0);
 const before=structuredClone(motion),out=strictSimEntities(sim);
 assert.deepEqual(out,[{bank:'enemy',slot:2,kind:'vertical-platform',x:object.x,y:object.y,source:'platform'}]);
 assert.deepEqual(structuredClone(motion),before,'readout must not advance platform state');
 assert.equal(strictSimCoverage(sim).some(g=>g.detail.startsWith('platform')),false);
 sim.platformSlots.clear();assert.deepEqual(strictSimEntities(sim),[],'unborn platforms are not active enemies');
});
test('platform slot, kind, position and lifetime mismatches remain audit failures',()=>{
 const r=new Uint8Array(2048);r[0xf+2]=1;r[0x16+2]=37;r[0x87+2]=40;r[0x6e+2]=2;r[0xcf+2]=184;r[0xb6+2]=1;
 const n=strictNativeEntities(r),actor={bank:'enemy' as const,slot:2,kind:'vertical-platform',x:552,y:184,source:'platform'};
 assert.deepEqual(strictEntityDifferences(n,[actor]).mismatches,[]);
 assert.equal(strictEntityDifferences(n,[{...actor,y:185}]).mismatches[0].code,'position');
 assert.equal(strictEntityDifferences(n,[{...actor,kind:'small-up-lift'}]).mismatches[0].code,'kind');
 assert.deepEqual(strictEntityDifferences(n,[{...actor,slot:1}]).mismatches.map(m=>m.code),['missing','extra']);
 assert.equal(strictEntityDifferences(strictNativeEntities(new Uint8Array(2048)),[actor]).mismatches[0].code,'extra');
});


test('wrapping geometry without a source object identity remains an explicit gap',()=>{
 const level=observedLevels().find(l=>l.id==='5-2')!,area=level.areas.find(a=>a.id==='optional-water')!,context={levelId:level.id,areaId:area.id};
 const platform={...area.platforms![0],x:area.platforms![0].x+1};
 assert.equal(nativePlatformObject(platform,context),undefined);
 const sim={level,area:{...area,platforms:[platform]},enemies:[],items:[],platformMotion:new PlatformMotion(context),platformFrame:0,platformSlots:new Map([[platform,0]])};
 assert.deepEqual(strictSimEntities(sim),[]);assert.ok(strictSimCoverage(sim).some(g=>g.code==='unsupported-sim-platform'));
});

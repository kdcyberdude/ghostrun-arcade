import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {BOWSER_HOP,bowserFlameSpeed,createBowserMotor,nativeBowserSpawnX} from '../src/bowser-motion.js';

// Native Bowser (object id 45) on the recorded route: anchor x and feet y per row (data/bowser-native-excerpts.json, from the native trace RAM; the primary
// half's x, native y + 32). Remake step k follows native row firstRow+k. Mario is a stand-in: left of Bowser, then right of him before the landing that turns him.
const excerpts=JSON.parse(readFileSync(new URL('../data/bowser-native-excerpts.json',import.meta.url),'utf8')) as {
 cases:{level:string;firstRow:number;mario:{before:number;after:number;afterRow:number};rows:[number,number,number][]}[];
};

function bridge(levelId:string,marioX:number){
 const level=structuredClone(observedLevels().find(l=>l.id===levelId)!);
 const area=level.areas.find(a=>a.id===level.main)!;
 for(const e of area.enemies)if(e.kind!=='bowser')e.x=99999;
 area.firebars=[];
 const sim=new Simulation([level]);sim.reset(true);
 const boss=sim.enemies.find(e=>e.kind==='bowser')!;assert.ok(boss);
 Object.assign(sim.player,{x:marioX,y:160,vx:0,vy:0,grounded:true,invincible:99999});sim.camera=boss.x-250;boss.active=true;
 return {sim,boss};
}
const crossOver=(sim:Simulation,x:number)=>{sim.player.x=x;sim.camera=Math.max(sim.camera,x-200);}; // the camera must follow or the screen edge clamps Mario

for(const c of excerpts.cases)test(`${c.level}: Bowser anchor, hops, turn and chase follow the native trace rows`,()=>{
 const {sim,boss}=bridge(c.level,c.mario.before);
 assert.equal(boss.x,c.rows[0][0],'spawn anchor is the native one');
 const nativeTurn=c.rows.findIndex((r,k)=>k>=30&&r[2]<0);assert.ok(nativeTurn>0);
 let worstX=0,worstY=0,remakeTurn=-1;
 for(let k=1;k<c.rows.length;k++){
  if(c.firstRow+k===c.mario.afterRow)crossOver(sim,c.mario.after);
  sim.step([],1);
  assert.equal(sim.phase,'play');
  const [x,feet]=c.rows[k],m=boss.bowser!;
  worstX=Math.max(worstX,Math.abs(m.anchor-x));worstY=Math.max(worstY,Math.abs(boss.y-feet));
  if(remakeTurn<0&&m.side>0)remakeTurn=k;
 }
 assert.ok(worstX<=2,`anchor error ${worstX}`);
 assert.ok(worstY<=4,`feet error ${worstY}`);
 assert.ok(Math.abs(remakeTurn-nativeTurn)<=2,`he turned to face Mario at row ${remakeTurn}, native ${nativeTurn}`);
});

test('the compiled spawn is replaced by the native anchor only while the spec holds the compiled value',()=>{
 assert.equal(nativeBowserSpawnX('1-4',2192),2160);
 assert.equal(nativeBowserSpawnX('4-4',2656),2672);
 assert.equal(nativeBowserSpawnX('1-4',220),220,'a fixture position is kept');
 assert.equal(observedLevels().find(l=>l.id==='1-4')!.areas.find(a=>a.id==='main')!.enemies.find(e=>e.kind==='bowser')!.x,2192);
});

test('native hop: first hop 30 frames after he appears, 35-frame rise of about 37 px, no hops or fire after he turns right',()=>{
 const {sim,boss}=bridge('1-4',1990);
 const ys:number[]=[];for(let k=0;k<110;k++){sim.step([],1);ys.push(boss.y);}
 assert.equal(ys[28],160);assert.ok(ys[30]<160,'rising from step 30');
 const apex=Math.min(...ys);assert.ok(apex>=122&&apex<=125,`apex ${apex}`);
 assert.ok(BOWSER_HOP.gravity>0.05&&BOWSER_HOP.vy<-2);
 crossOver(sim,2236);for(let k=0;k<200&&boss.bowser!.side<0;k++)sim.step([],1);
 assert.equal(boss.bowser!.side,1,'he turned to face Mario');
 for(let k=0;k<250;k++){sim.step([],1);assert.equal(boss.y,160,'chasing Bowser stays on the bridge');}
 assert.equal(sim.items.some(i=>i.kind==='flame'),false,'no fire while he faces right');
});

test('native fire: only while he faces left, 255 frames after he appears and every 207, flames 1.25 px/frame before 5-4 and 11/8 from 5-4',()=>{
 const {sim}=bridge('1-4',1990);
 const flames:number[]=[];
 for(let k=1;k<=700;k++){const before=sim.items.filter(i=>i.kind==='flame').length;sim.step([],1);if(sim.items.filter(i=>i.kind==='flame').length>before)flames.push(k);sim.player.invincible=999;}
 assert.deepEqual(flames,[255,462,669]);
 assert.equal(bowserFlameSpeed('4-4'),1.25);assert.equal(bowserFlameSpeed('5-4'),1.375);assert.equal(bowserFlameSpeed('8-4'),1.375);
 assert.equal(createBowserMotor(2160,'6-4').rightLimit,18);assert.equal(createBowserMotor(2160,'5-4').rightLimit,34);
});

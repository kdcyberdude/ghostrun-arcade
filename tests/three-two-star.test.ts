import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function below(size:0|1=0,oldFragment=false){
 const level=structuredClone(observedLevels().find(l=>l.id==='3-2')!);
 const main=level.areas.find(a=>a.id==='main')!;
 main.spawn=[1232,144];main.camera=1120;main.enemies=[];main.generators=[];
 if(oldFragment){
  main.tiles=main.tiles.filter(t=>t[0]!==77||t[1]!==5);
  main.freeTiles!.push({x:1229,y:80,id:81,palette:16});
 }
 const sim=new Simulation([level]);sim.reset(true);sim.player.size=size;return sim;
}

test('3-2 upper brick emits the independently observed Star after an ordinary head hit',()=>{
 const sim=below();sim.step(['a'],20);
 assert.equal(sim.tiles.get('77,5'),196);assert.equal(sim.coins,0);assert.equal(sim.score,0);
 assert.equal(sim.items.length,1);assert.equal(sim.items[0].kind,'star');
 assert.ok(sim.events.includes('sfx_powerup_appears'));assert.equal(sim.lives,3);
 assert.equal(sim.freeTiles.some(t=>t.x===1229&&t.y===80&&t.id===81),false);
});

test('3-2 original misplaced free-fragment negative control cannot emit the Star',()=>{
 const sim=below(0,true);sim.step(['a'],20);
 assert.equal(sim.tiles.has('77,5'),false);assert.equal(sim.items.length,0);
 assert.ok(sim.events.includes('sfx_bump'));assert.equal(sim.score,0);assert.equal(sim.coins,0);
});

test('3-2 Star brick transfers existing large-player content priority as an inferred rule',()=>{
 const sim=below(1);sim.step(['a'],20);
 assert.equal(sim.tiles.get('77,5'),196);assert.equal(sim.items.length,1);assert.equal(sim.items[0].kind,'star');
 assert.equal(sim.items.some(i=>i.kind==='debris'),false);assert.equal(sim.score,0);
});

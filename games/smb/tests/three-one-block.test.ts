import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function below(col:number,size:0|1=0){
 const level=structuredClone(observedLevels().find(l=>l.id==='3-1')!);
 const main=level.areas.find(a=>a.id==='main')!;
 main.spawn=[col*16,208];main.camera=col*16-112;main.enemies=[];main.generators=[];
 const sim=new Simulation([level]);sim.reset(true);sim.player.size=size;return sim;
}

test('3-1 third opening question emits the independently observed mushroom after an ordinary head hit',()=>{
 const sim=below(22);sim.step(['a'],20);
 assert.equal(sim.tiles.get('22,8'),196);assert.equal(sim.coins,0);assert.equal(sim.score,0);
 assert.equal(sim.items.length,1);assert.equal(sim.items[0].kind,'mushroom');
 assert.ok(sim.events.includes('sfx_powerup_appears'));assert.equal(sim.lives,3);
});

test('3-1 third opening question transfers the existing large-player flower rule explicitly as inference',()=>{
 const sim=below(22,1);sim.step(['a'],20);
 assert.equal(sim.items.length,1);assert.equal(sim.items[0].kind,'flower');
 assert.equal(sim.coins,0);assert.equal(sim.score,0);
});

test('3-1 first two opening questions retain their independently observed coin contents',()=>{
 for(const[col,row]of[[16,9],[19,8]]){
  const sim=below(col);sim.step(['a'],20);
  assert.equal(sim.tiles.get(col+','+row),196);assert.equal(sim.coins,1);assert.equal(sim.score,200);
  assert.equal(sim.items[0].kind,'coin');
 }
});

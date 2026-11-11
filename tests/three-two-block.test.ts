import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function below(size:0|1=0,omit=false){
 const level=structuredClone(observedLevels().find(l=>l.id==='3-2')!);
 const main=level.areas.find(a=>a.id==='main')!;
 main.spawn=[960,160];main.camera=848;main.enemies=[];main.generators=[];
 if(omit)main.tiles=main.tiles.filter(t=>t[0]!==60||t[1]!==6);
 const sim=new Simulation([level]);sim.reset(true);sim.player.size=size;return sim;
}

test('3-2 observed question emits a mushroom after an ordinary head hit from the real pillar',()=>{
 const sim=below();sim.step(['a'],20);
 assert.equal(sim.tiles.get('60,6'),196);assert.equal(sim.coins,0);assert.equal(sim.score,0);
 assert.equal(sim.items.length,1);assert.equal(sim.items[0].kind,'mushroom');
 assert.ok(sim.events.includes('sfx_powerup_appears'));assert.equal(sim.lives,3);
});

test('3-2 omitted-question negative control has no item or head collision',()=>{
 const current=below(),omitted=below(0,true);current.step(['a'],20);omitted.step(['a'],20);
 assert.equal(omitted.tiles.has('60,6'),false);assert.equal(omitted.items.length,0);
 assert.ok(omitted.player.y<current.player.y,'The absent block must allow the jump to continue above the real head collision');
 assert.equal(omitted.score,0);assert.equal(omitted.coins,0);
});

test('3-2 observed question transfers the existing large-player flower rule explicitly as inference',()=>{
 const sim=below(1);sim.step(['a'],20);
 assert.equal(sim.tiles.get('60,6'),196);assert.equal(sim.items.length,1);assert.equal(sim.items[0].kind,'flower');
 assert.equal(sim.coins,0);assert.equal(sim.score,0);
});

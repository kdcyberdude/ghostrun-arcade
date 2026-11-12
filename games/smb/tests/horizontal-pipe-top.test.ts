import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function room(x:number,y:number){
 const level=structuredClone(observedLevels().find(level=>level.id==='1-1')!);
 level.main='bonus-coins';
 level.areas.find(area=>area.id==='bonus-coins')!.spawn=[x,y];
 const simulation=new Simulation([level]);simulation.reset(true);return simulation;
}

test('horizontal pipe supports a falling player on its observed top',()=>{
 const simulation=room(204,170);simulation.player.vy=4;
 simulation.step([],3);
 assert.equal(simulation.player.y,176);
 assert.equal(simulation.player.grounded,true);
 simulation.step([],8);
 assert.equal(simulation.player.y,176);
});

test('horizontal pipe remains enterable from its open side',()=>{
 const simulation=room(186,208);
 for(let frame=0;frame<30&&simulation.phase==='play';frame++)simulation.step(['right'],1);
 assert.equal(simulation.phase,'pipe');
 for(let frame=0;frame<100&&simulation.area.id==='bonus-coins';frame++)simulation.step(['right'],1);
 assert.equal(simulation.area.id,'main');
});

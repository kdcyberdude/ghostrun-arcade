import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function fixture(big=false){
 const level=structuredClone(observedLevels().find(l=>l.id==='3-2')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=[];area.generators=[];area.exit=undefined;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1232,208],1189);
 if(big)sim.player.size=1;
 return sim;
}
const jump=(sim:Simulation)=>{sim.step(['a'],16);sim.step([],24);};

test('the multi-coin timer starts at 11 on the first hit and ticks on the 21-row interval clock',()=>{
 // Native BrickCoinTimer $079D (smb-fast 6-2 d09224d1 RAM 48787: 11 on the first hit, one less each time $077F wraps).
 const sim=fixture();jump(sim);const s=sim as any;assert.equal(s.brickCoinStarted,true);
 const timer=s.brickCoinTimer;assert.ok(timer>=10&&timer<=11);
 sim.step([],21);assert.equal(s.brickCoinTimer,timer-1);
});

test('ordinary repeated jumps award coins, keep the brick until a late hit, then stop at used',()=>{
 const sim=fixture();jump(sim);assert.equal(sim.coins,1);assert.equal(sim.score,200);
 assert.equal(sim.tiles.get('77,9'),88);
 jump(sim);assert.equal(sim.coins,2);assert.equal(sim.score,400);
 sim.step([],240);assert.equal(sim.tiles.get('77,9'),88,'expiry must not passively change artwork');
 jump(sim);assert.equal(sim.coins,3);assert.equal(sim.score,600);assert.equal(sim.tiles.get('77,9'),196);
 for(let n=0;n<3;n++)jump(sim);
 assert.equal(sim.coins,3);assert.equal(sim.score,600);assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});

test('large-player content transfer awards a coin instead of shattering the multi-coin brick',()=>{
 const sim=fixture(true);jump(sim);
 assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.tiles.get('77,9'),88);
 assert.ok(sim.items.every(item=>item.kind!=='debris'));
});

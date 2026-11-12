import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {nativeHurtHeight,nativeHurtReachX} from '../src/native-hurtbox.js';
import type {EnemySpec,Level,Tile} from '../src/types.js';

// Native free-play rows (evidence/contact3-findings-20261111.md; 768 model-run traces explore-r1/r2/r3/w0, small Mario, live enemies):
// dx = enemy x of the row before - Mario x of the row (integers), dy likewise for y; H/L = rows where the touch hurt / did not.
// Koopa |dx| 11: 37 H / 179 L, |dx| 12: 0 H / 275 L. Beetle 11: 4/12, 12: 0/20. Paratroopa 11: 19/54, 12: 0/105. Red Koopa 11: 2/3.
// Goomba 11: 0/130, Spiny 11: 0/31, Piranha 11: 0/78, Podoboo 11: 0/31, Hammer Bro 11: 0/12.
// Paratroopa height: hurts at dy -1..12 (98 rows), none at dy 13..23 (0 H / 204 L, 51 of them a rising Mario).
test('horizontal touch reach per kind: Koopa-shaped enemies 11 px, the others 10',()=>{
 for(const k of ['koopa','redKoopa','beetle','paratroopa'])assert.equal(nativeHurtReachX(k),11,k);
 for(const k of ['goomba','spiny','piranha','podoboo','hammerBro'])assert.equal(nativeHurtReachX(k),10,k);
});

test('a Paratroopa touches down to dy 12 only (native 0 hurts in 204 rows at dy 13..23)',()=>{
 assert.equal(nativeHurtHeight('paratroopa',12,false,false),true);
 assert.equal(nativeHurtHeight('paratroopa',13,false,false),false);
 assert.equal(nativeHurtHeight('paratroopa',23,false,false),false);
});

function sideContact(kind:EnemySpec['kind'],marioX:number){
 const tiles:Tile[]=Array.from({length:64},(_,x)=>[x,13,84]);
 const level:Level={id:'fixture',time:400,main:'main',evidence:'Synthetic side-contact fixture at native offsets',areas:[{id:'main',width:1024,palette:0,theme:'ground',spawn:[60,208],tiles,enemies:[{kind,x:109,y:208}],evidence:'Synthetic'}]};
 const sim=new Simulation([level]);sim.reset(true);
 sim.player.x=marioX;sim.player.y=208;sim.player.vy=0;sim.player.grounded=true;
 (sim as any).updateEnemies(sim.player.y);
 return sim.phase;
}

test('standing Mario beside a ground Koopa at native dx 11 is hurt, at dx 12 not; a Goomba at dx 11 does not hurt',()=>{
 // the walker steps left (away from Mario) before the test, so the remake's post-step overlap box no longer reaches; native uses the x before the step
 assert.equal(sideContact('koopa',120),'dying'); // enemy x 109 before its step: dx -11 (native 3-1/mood3 r1348-style side touch)
 assert.equal(sideContact('koopa',121),'play'); // dx -12
 assert.equal(sideContact('beetle',120),'dying');
 assert.equal(sideContact('goomba',120),'play'); // dx -11
});

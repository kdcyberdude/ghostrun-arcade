import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// evidence/water3-findings-20261111.md: 2-2 / 7-2 free-play rows at x 2759..2781 (2-2 explore-r3 mood0 rows 2062..2082, mood5 rows 2118..2131).
const room=(id:string)=>{const level=structuredClone(observedLevels().find(l=>l.id===id)!);return level.areas.find(a=>a.theme==='water'&&a.width===3088)!;};

test('2-2 water room has the pillar top at columns 172-173 like the 7-2 copy (native stands at y 16 there for 153 of 153 rows)',()=>{
 for(const id of ['2-2','7-2']){const tiles=new Set(room(id).tiles.map(t=>`${t[0]},${t[1]}`));for(const t of ['172,3','173,3','172,4','173,4'])assert.ok(tiles.has(t),`${id} ${t}`);}
});

test('a swimmer standing on a pillar top with Down+Right slows by 152 per frame even on frames that press A (native rows 2062..2078: 6344 -> 3912)',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='2-2')!);level.main='area-2';
 const sim=new Simulation([level]);sim.reset(true);
 for(let f=0;f<60;f++)sim.step([],1);sim.seedSwim({speed:0});(sim as any).swimActive=true;const p=sim.player;p.x=2759;p.y=16+32;p.vx=6344/4096;p.vy=0;p.grounded=true;
 const vs:number[]=[];for(let f=0;f<8;f++){sim.step(f%2?['down','right','a']:['down','right'],1);vs.push(Math.round(sim.player.vx*4096));}
 assert.deepEqual(vs,[6192,6040,5888,5736,5584,5432,5280,5128]);
 assert.equal(Math.floor(sim.player.y)-32,16);
});

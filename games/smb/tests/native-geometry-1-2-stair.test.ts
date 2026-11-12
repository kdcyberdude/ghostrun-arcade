import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native feet = y + 32; walls at x+12/x+2 probes at feet-12 and feet-8 (same convention as native-geometry-corrections.test.ts).
test('1-2 area-2: native rows 3583-3589 pass x 2102-2112 at feet 203-184, the first stair column starts at 2128 not 2112',()=>{
 const levels=structuredClone(observedLevels()),sim=new Simulation(levels) as any;sim.reset(true);
 sim.levelIndex=levels.findIndex(l=>l.id==='1-2');sim.loadArea('area-2',[40,208],0);
 for(const [x,y] of [[2102,171],[2104,166],[2107,161],[2109,156],[2112,152]]){
  const feet=y+32;
  for(const py of [feet-12,feet-8])for(const px of [x+12,x+2])assert.equal(sim.collisionAt(px,py),undefined,`wall ${px},${py}`);
 }
 assert.notEqual(sim.collisionAt(2128+4,200),undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {renderEquivalenceSnapshot} from '../tools/visual3d/equivalence-snapshot.js';
test('render equivalence reads every actor bank and stored motor/timer state without querying positions',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);const s=sim as any;
 s.platformPosition=()=>{throw Error('must not query lazy platform motor');};
 const initial=renderEquivalenceSnapshot(sim);assert.equal(renderEquivalenceSnapshot(sim),initial);
 for(const mutate of [()=>s.items.push({kind:'coin',x:1,y:2}),()=>s.popups.push({value:100,x:3,y:4}),()=>s.bubbleState.slots[0].y++,()=>s.random.bytes[0]^=1,()=>s.intervalControl++,()=>s.springTimers.set({x:10,y:20},{timer:3}),()=>s.platformMotion.lost.add({x:10,y:20}),()=>Object.defineProperty(s,'nativeFrenzyTimer',{value:3,configurable:true}),()=>Object.defineProperty(s,'nativeCastleFlag',{value:{y:1},configurable:true}),()=>Object.defineProperty(s,'nativeFireworks',{value:[{x:2,y:3}],configurable:true}),()=>Object.defineProperty(s,'nativeEndLevelMusic',{value:4,configurable:true})]){
  const before=renderEquivalenceSnapshot(sim);mutate();assert.notEqual(renderEquivalenceSnapshot(sim),before);
 }
 assert.ok(initial.includes('"type":"Map"'));assert.ok(initial.includes('"type":"Number","value":"-Infinity"'));
 const browserCopy=eval('('+renderEquivalenceSnapshot.toString()+')');assert.equal(browserCopy(sim),renderEquivalenceSnapshot(sim));
});

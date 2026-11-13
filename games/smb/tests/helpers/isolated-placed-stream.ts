import type {Simulation} from '../../src/simulation.js';
/** Component fixtures replacing the actor roster must also replace its physical ROM stream.
 * Call before reset/loadArea; campaign/native replay tests retain the full source stream.
 */
export function isolatePlacedStream<T extends Simulation>(sim:T):T{
 const s=sim as unknown as {placedStream?:unknown;placedCastle:boolean;placedHammerBros:boolean};
 const clear=()=>{s.placedStream=undefined;s.placedCastle=false;s.placedHammerBros=false;};
 clear(); // The constructor has already loaded its first area.
 Object.defineProperty(sim,'setupNativePlacedStream',{value:clear,configurable:true});
 return sim;
}

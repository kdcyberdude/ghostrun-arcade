// Deterministic controller route shared by the 2.5D verification tools: the recorded observed winning inputs (data/observed-winning-inputs.json).
import inputs from '../../data/observed-winning-inputs.json';
import type {Button} from '../../src/types.js';
const keys:Button[]=['up','down','left','right','a','b'];
/** One entry per emulated frame: the pressed buttons (player 1). */
export function routeFrames():Button[][]{
 const out:Button[][]=[];
 for(const [mask,frames] of inputs.actions as number[][])for(let f=0;f<frames;f++)out.push(keys.filter((_,b)=>mask&(1<<b)));
 return out;
}

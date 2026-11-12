/** Native clocks across the area load that ends an automatic intro pipe (1-2, 2-2, 4-2, 7-2 v2 traces, 4 of 4): the load row (engine 0, task $0772 0 -> 1)
 * sets FrameCounter $09 to 0 and holds the random register $07A7 and the interval clock $077F for that row; every other row of the pipe sequence ticks both.
 * The remake enters the new area 24 rows after that load row (native $09 = 24 there, $077F = the frozen pipe value advanced by all pipe rows but one).
 * Other area changes (8-4 pipes: the load row comes 4 rows after the remake's entry) are not covered. */
import type {NativeRandom} from './native-random.js';
export const AUTO_WALK_LOAD_ROWS=24;
/** Applies the load to the remake's clocks on its entry row; returns the interval clock (20..0) after `pipeRows` rows of the pipe phase. */
export function nativeAutoWalkAreaLoad(random:NativeRandom,intervalControl:number,pipeRows:number){
 random.bytes=[...random.prev];random.frame=AUTO_WALK_LOAD_ROWS;
 return ((intervalControl-(pipeRows-1))%21+21)%21;
}

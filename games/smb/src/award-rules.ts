/** Native award and flag-touch rules read from v2 RAM traces (score digits $07DD, coins $075E, block buffer $0500, engine $0E). */

/** Metatile id of a coin in the remake's tile grid (native $C2; $C3 is the underwater coin, which CheckTopOfBlock does not take). */
export const COIN_TILE=194;

/** Native FlagpoleCollision (HandleClimbing): the pole is taken when floor(x)+10 reaches the pole column, exit.x-8 (19 of 19 v2 grabs; 4-1 row 1572: x 3590 touches, 3587 the row before does not). */
export function flagPoleTouched(x:number,exitX:number){return Math.floor(x)+10>=exitX-8;}


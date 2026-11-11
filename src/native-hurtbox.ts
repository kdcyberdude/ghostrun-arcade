/** Vertical reach of the native enemy-touch test, measured on the rows of native contact deaths against the rows where small Mario lives (evidence/hurtbox-findings-20261111.md).
 * dy = enemy native y - Mario native y (feet: enemy y + 24, Mario y + 32), integers, Mario after his move and the enemy before its own. */
/** Lowest enemy that still touches (largest dy), per kind. Piranha: controlled native rectangles put its top at prior y+14 against Mario bottom y+32, before a floor snap. */
const BELOW:Record<string,number>={goomba:18,koopa:23,redKoopa:23,beetle:23,paratroopa:12,/* Paratroopa: 98 hurts at dy -1..12, none in 204 rows at dy 13..23 (evidence/contact3-findings-20261111.md) */hammerBro:23,spiny:17,piranha:18,podoboo:16,blooper:17,cheep:12,bullet:15};
/** Highest enemy that still touches small Mario (smallest dy): 0, a Paratroopa -1. Big Mario's head is unmeasured, so his top edge is not tested here. */
const aboveSmall=(kind:string)=>kind==='paratroopa'?-1:0;

/** Widest integer |enemy x before its move - Mario x| that still touches: 11 for the Koopa-shaped kinds (native |dx| 11: 62 hurts, |dx| 12: none in 400 rows), 10 for the rest
 * (Goomba, Spiny, Piranha, Podoboo, Hammer Bro: no hurt at 11 in 280 rows). evidence/contact3-findings-20261111.md */
export function nativeHurtReachX(kind:string){return ['koopa','redKoopa','beetle','paratroopa'].includes(kind)?11:10;}

/** Is this enemy at touching height? Kinds without native deaths (Bowser, Lakitu) answer `unmeasured`. */
export function nativeHurtHeight(kind:string,dy:number,big:boolean,unmeasured:boolean){
 const below=kind==='piranha'&&big?20:BELOW[kind]; // big Piranha contacts keep their previous unmeasured bottom
 if(below===undefined)return unmeasured;
 return dy<=below&&(big||dy>=aboveSmall(kind));
}

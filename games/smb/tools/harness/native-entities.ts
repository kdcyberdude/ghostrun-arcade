/** Native enemy slots vs the remake's enemies, for native-divergence.ts and the multi-run excerpt tests.
 * Native: 5 slots, active flag $0F+k (a flag with d7 set, $80 | owner slot, is a part of another object, e.g. the second slot of a 5-4 long firebar: skipped), id $16+k, x = $6E+k page * 256 + $87+k, y = $CF+k (sprite top). The remake keeps feet y (+32 offset), so a
 * native y equals remake (y - 32 + 8) & 255 for every walker measured on the 32 v2 traces. Only ids with a remake counterpart in sim.enemies are
 * compared (platforms, firebars, springs, cannons and items live elsewhere); a slot's first active frame is skipped because the remake activates
 * one frame after the native spawn. Read-only measurement code; never used by the browser game. */
import type {EnemyKind} from '../../src/types.js';
export const NATIVE_ENEMY_KIND:Record<number,EnemyKind>={0:'koopa',1:'redKoopa',2:'beetle',3:'redKoopa',4:'koopa',5:'hammerBro',6:'goomba',7:'blooper',8:'bullet',10:'cheep',11:'cheep',12:'podoboo',13:'piranha',14:'paratroopa',15:'paratroopa',16:'paratroopa',17:'lakitu',18:'spiny',20:'cheep',45:'bowser'};
export type Entity={kind:EnemyKind,x:number,y:number};
export function nativeEntities(r:Uint8Array,prev?:Uint8Array):Entity[]{
 const out:Entity[]=[];
 for(let k=0;k<5;k++){const kind=NATIVE_ENEMY_KIND[r[0x16+k]];if(!r[0xf+k]||r[0xf+k]&0x80||!kind||(prev&&!prev[0xf+k]))continue;out.push({kind,x:r[0x6e+k]*256+r[0x87+k],y:r[0xcf+k]});}
 return out;
}
export function simEntities(sim:any):Entity[]{
 return sim.enemies.filter((e:any)=>e.active&&(!e.dead||e.squashed&&e.dead<90)).map((e:any)=>({kind:e.kind,x:Math.floor(e.x),y:(Math.floor(e.y)-32+8)&255}));
}
/** First native entity with no remake enemy of the same kind at the same pixel (undefined when all are matched). */
export function unmatchedEntity(native:Entity[],sim:Entity[]):Entity|undefined{
 const pool=[...sim];
 for(const n of native){const i=pool.findIndex(s=>s.kind===n.kind&&s.x===n.x&&s.y===n.y);if(i<0)return n;pool.splice(i,1);}
}

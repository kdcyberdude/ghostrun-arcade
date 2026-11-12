// Metatile id -> what the tile IS (classified by looking at the metatile atlas, not from ROM data). Colours come from the area theme/palette, not the id.
export type Kind='piece'|'tree'|'sidePipe'|'empty'|'void'|'ground'|'wall'|'brick'|'question'|'used'|'hard'|'pipe'|'flagBall'|'flagPole'|'castle'|'hill'|'bush'|'cloud'|'coin'|'other';
const EMPTY=[0,35,38,68,95,96,103];
const KINDS:Record<number,Kind>={};
for(const id of EMPTY)KINDS[id]='empty';
for(const id of [1,75,102])KINDS[id]='void';
KINDS[84]='ground';
for(const id of [81,82,83])KINDS[id]='brick';
for(let id=85;id<=94;id++)KINDS[id]='wall';
KINDS[97]='hard';
KINDS[192]=KINDS[193]='question';KINDS[196]='used';KINDS[194]=KINDS[195]='coin';
for(const id of [16,17,18,19,20,21])KINDS[id]='pipe';
for(const id of [28,29,30,31,32,33,107,108])KINDS[id]='sidePipe';   // horizontal pipe: 28/29/30 upper row (mouth, body, junction), 31-33 lower row
KINDS[36]='flagBall';KINDS[37]='flagPole';
for(const id of [69,70,71,72,73,74])KINDS[id]='castle';
for(const id of [5,6,7,8,9,10])KINDS[id]='hill';
for(const id of [2,3,4])KINDS[id]='bush';
for(const id of [128,129,130,131,132,133])KINDS[id]='cloud';
export const kindOf=(id:number):Kind=>KINDS[id]??'other';
/** Some ids change meaning with the area palette: in water areas id 10 (a hill fill elsewhere) is the open-water background. */
export const kindIn=(id:number,theme:string):Kind=>theme==='water'&&id===10?'empty':kindOf(id);
export const isPipeTop=(id:number)=>id===16||id===18;      // top-left tile of a 2-wide pipe mouth
export const isPipeBody=(id:number)=>id===20;              // left shaft tile
export const SCENERY_KINDS:Kind[]=['hill','bush','cloud'];
for(const id of [98])KINDS[id]='wall';                        // castle stone
for(const id of [13,14,15,78])KINDS[id]='tree';                // background tree (canopy pieces + trunk)
/** Single-tile pieces drawn from one kit model (non-solid decorations sit slightly behind the plane: dz < 0). */
export const PIECES:Record<number,{model:string;dz?:number;rotY?:number}>={
 99:{model:'block_bridge'},11:{model:'deco_rail',dz:-0.1},77:{model:'deco_fence',dz:-0.7},100:{model:'cannon_top'},101:{model:'cannon_base'},
 105:{model:'block_seabed'},136:{model:'block_cloud'},137:{model:'block_bowser_bridge'},197:{model:'axe',dz:0.1},
 22:{model:'plat_tree_l'},23:{model:'plat_tree_m'},24:{model:'plat_tree_r'},76:{model:'trunk',dz:-0.25},
 25:{model:'plat_mush_l'},26:{model:'plat_mush_m'},27:{model:'plat_mush_r'},79:{model:'mush_stem',dz:-0.2},80:{model:'mush_stem',dz:-0.2},
 34:{model:'deco_coral',dz:-0.4},64:{model:'rope_v',dz:-0.3},65:{model:'rope_h',dz:-0.3},66:{model:'pulley',dz:-0.3},67:{model:'pulley',dz:-0.3},12:{model:'chain',dz:-0.2},
 134:{model:'liquid_top'},135:{model:'liquid'},
};
for(const id of Object.keys(PIECES).map(Number))KINDS[id]='piece';

/** Number packets in VRAM_Buffer1 wait while control6 selects buffer2.
 * This is displayed PPU state, separate from the CPU score/coin/timer digits. */
export interface NativeHudDigits {score:string;coins:string;time:string}
const specs={score:[0x2063,6],coins:[0x206d,2],time:[0x207a,3]} as const;
export const hudDigits=(score:number,coins:number,time?:number):NativeHudDigits=>({score:String(score).padStart(6,'0'),coins:String(coins).padStart(2,'0'),time:time===undefined?'   ':String(time).padStart(3,'0')});
function glyph(tile:number){return tile<10?String(tile):tile<36?String.fromCharCode(65+tile-10):({36:' ',40:'-',41:'×',43:'!',175:'.',207:'©'} as Record<number,string>)[tile];}
export function hudFromNametable(tiles?:{score:readonly number[];coins:readonly number[];time:readonly number[]}){
 if(!tiles)return;const out={} as NativeHudDigits;
 for(const key of Object.keys(specs) as (keyof NativeHudDigits)[]){if(tiles[key].length!==specs[key][1]||tiles[key].some(t=>glyph(t)===undefined))return;out[key]=tiles[key].map(glyph).join('');}return out;
}
/** Only buffer2 preserves buffer1 after the first PPU picture has consumed it. */
export function pendingHudFromRam(ram:Uint8Array,base:NativeHudDigits){
 const pending:Partial<NativeHudDigits>={};if(ram[0x773]!==6)return pending;
 for(let offset=0;offset<ram[0x300];){
  const high=ram[0x301+offset];if(!high)break;const address=((high&63)<<8)|ram[0x302+offset],control=ram[0x303+offset],length=control&63,repeat=Boolean(control&64),step=control&128?32:1;
  for(let i=0;i<length;i++)for(const key of Object.keys(specs) as (keyof NativeHudDigits)[]){const index=address+i*step-specs[key][0],text=glyph(ram[0x304+offset+(repeat?0:i)]);if(index>=0&&index<specs[key][1]&&text!==undefined){const value=(pending[key]??base[key]).split('');value[index]=text;pending[key]=value.join('');}}
  offset+=3+(repeat?1:length);
 }return pending;
}
export class NativeHud {
 draw=hudDigits(0,0);private pending:Partial<NativeHudDigits>={};initialObserved=false;
 seed(draw:NativeHudDigits,pending:Partial<NativeHudDigits>={},observed=false){this.draw={...draw};this.pending={...pending};this.initialObserved=observed;}
 queue(values:Partial<NativeHudDigits>){Object.assign(this.pending,values);}
 clearTime(){this.draw.time='   ';delete this.pending.time;}
 header(score:number,coins:number){this.draw=hudDigits(score,coins);this.pending={};}
 step(buffer2:boolean){if(!buffer2){Object.assign(this.draw,this.pending);this.pending={};}}
}

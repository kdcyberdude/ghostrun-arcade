import {NativeVramBuffer1} from './native-vram-buffer.js';
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
 constructor(readonly buffer1=new NativeVramBuffer1()){}
 draw=hudDigits(0,0);private pending:Partial<NativeHudDigits>={};initialObserved=false;
 seed(draw:NativeHudDigits,pending:Partial<NativeHudDigits>={},observed=false,raw?:Uint8Array){this.draw={...draw};this.pending={...pending};this.initialObserved=observed;this.buffer1.clear();if(raw)this.buffer1.seed(raw,6);else for(const [key,value]of Object.entries(pending))this.write(key as keyof NativeHudDigits,value!);}
 queue(values:Partial<NativeHudDigits>){for(const [key,value]of Object.entries(values))this.write(key as keyof NativeHudDigits,value!);Object.assign(this.pending,values);}
 private write(key:keyof NativeHudDigits,value:string){
  const score=key==='score',digits=score?String(Math.floor(Number(value)/10)).padStart(6,'0').slice(-6):value;
  const payload=[...digits].map(c=>c===' '?36:Number(c));if(score&&payload[0]===0)payload[0]=36;
  this.buffer1.append({address:score?0x2062:specs[key][0],control:payload.length,payload});
 }
 clearTime(){this.draw.time='   ';delete this.pending.time;}
 /** The packets queued so far are overwritten in VRAM_Buffer1 (WriteGameText for the warp zone writes from its start). */
 dropPending(){this.pending={};}
 header(score:number,coins:number){this.draw=hudDigits(score,coins);this.pending={};}
 /** discarded: the NMI uploads another table ($0773=8, the Bowser palette) and still clears buffer1, so its digits never reach the screen (9c64d039 1-4 rows 14746-14771: TIME stays 254). */
 step(buffer2:boolean,discarded=false){this.buffer1.select(buffer2);if(!buffer2){if(!discarded)Object.assign(this.draw,this.pending);this.pending={};}}
}

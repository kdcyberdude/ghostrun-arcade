/** SpriteShuffler: OAM byte offsets and amounts are ROM defaults/observed RAM,
 * not actor birth order. Lower OAM addresses win when sprite pixels overlap. */
export const DEFAULT_SPRITE_OFFSETS=[0x04,0x30,0x48,0x60,0x78,0x90,0xa8,0xc0,0xd8,0xe8,0x24,0xf8,0xfc,0x28,0x2c] as const;
export class NativeSpriteShuffle{
 offsets:number[]=[...DEFAULT_SPRITE_OFFSETS];amounts=[0x58,0x48,0x38];index=0;
 reset(){this.offsets=[...DEFAULT_SPRITE_OFFSETS];this.amounts=[0x58,0x48,0x38];this.index=0;}
 /** SetMiscOffset expands three OAM blocks into nine individual misc slots. */
 miscOffset(slot:number){return (this.offsets[5+Math.floor(slot/3)]+8*(slot%3))&255;}
 step(){
  for(let i=14;i>=0;i--){const value=this.offsets[i];if(value<0x28)continue;const sum=value+this.amounts[this.index];this.offsets[i]=((sum&255)+(sum>255?0x28:0))&255;}
  this.index=(this.index+1)%3;
 }
}

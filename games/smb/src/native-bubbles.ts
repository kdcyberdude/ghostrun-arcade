/** Native BubbleCheck / SetupBubble. Coordinates and fractions are the RAM bytes,
 * not sprite-adjusted positions. The three slots share AirBubbleTimer ($0792). */
export interface NativeBubble {x:number;y:number;page:number;fraction:number}
export interface BubblePlayer {x:number;y:number;facing:number}
export class NativeBubbles {
 readonly slots:NativeBubble[]=Array.from({length:3},()=>({x:0,y:0,page:0,fraction:0}));
 timer=0;
 reset(){this.timer=0;for(const b of this.slots)Object.assign(b,{x:0,y:0,page:0,fraction:0});}
 private move(b:NativeBubble,force:number){const diff=b.fraction-force;b.fraction=diff&255;b.y=(b.y-(diff<0?1:0))&255;if(b.y<32)b.y=248;}
 private spawn(b:NativeBubble,p:BubblePlayer,timer:number){b.x=(Math.floor(p.x)+(p.facing===1?9:0))&65535;b.y=(Math.floor(p.y)+8)&255;b.page=1;this.timer=timer;}
 /** Entrance_GameTimerSetup calls SetupBubble without BubbleCheck's AND #1.
  * The preceding water floor render leaves MetatileGraphics_High[1]=$91 in $07.
  * At Bubble_MForceData+$91 / BubbleTimerData+$91 the ROM contains $f9 / $04
  * (instruction operands), so the entrance bubble uses those bytes. */
 entrance(p:BubblePlayer){this.spawn(this.slots[0],p,4);this.move(this.slots[0],249);}
 step(p:BubblePlayer,random:readonly number[],tickTimer=true){
  if(tickTimer&&this.timer)this.timer--;
  for(let s=2;s>=0;s--){const b=this.slots[s],bit=random[s+1]&1;if(b.y===248){if(this.timer)continue;this.spawn(b,p,bit?32:64);}this.move(b,bit?80:255);}
 }
}

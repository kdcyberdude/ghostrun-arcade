/** Platform enemy-bank motor bytes. a=$A0, b=$58, c=$0401,
 * d=$0434, e=$0417. X/Y are raw native positions, with Y page1 mapped to0.
 * Explicit turns use the actual FrameCounter; elapsed display frames never
 * imply movement. Source: XMoveCntr_Platform, YMovingPlatform, ImposeGravity,
 * MoveLiftPlatforms, DropPlatform and BalancePlatform's normal motor. */
export interface NativePlatformBytes {id:number;x:number;y:number;a:number;b:number;c:number;d:number;e:number}
const signed=(n:number)=>(n<<24)>>24;
const yWord=(n:number)=>((n+256)&65535)-256;
function gravity(n:NativePlatformBytes,down:number,max:number,up=false){
 const fraction=n.e+n.d,dy=signed(n.a)+(fraction>>8);n.e=fraction&255;n.y=yWord(n.y+dy);
 const force=n.d+down;n.d=force&255;n.a=(n.a+(force>>8))&255;
 if(signed(n.a)>=max&&n.d>=128){n.a=max;n.d=0;}
 if(up){const force=n.d-10;n.d=force&255;if(force<0)n.a=(n.a-1)&255;if(signed(n.a)<-max&&n.d<128){n.a=(-max)&255;n.d=255;}}
 return dy;
}
function horizontal(n:NativePlatformBytes,speed:number){
 const whole=speed>>4,integer=whole>=8?whole-16:whole,fraction=n.c+((speed<<4)&255),dx=integer+(fraction>>8);
 n.c=fraction&255;n.x=(n.x+dx)&65535;return dx;
}
/** run=false is TimerControl observed at this object's own bank turn. load is
 * the native collision flag translated to first-side−1 / none0 / second-side1. */
export function stepNativePlatform(n:NativePlatformBytes,counter:number,run=true,load=0){
 let dx=0,dy=0;if(!run)return {dx,dy};
 if(n.id===40){
  if((counter&3)===0){if(n.a&1){if(n.b===0)n.a=(n.a+1)&255;else n.b--;}else if(n.b===14)n.a=(n.a+1)&255;else n.b++;}
  dx=horizontal(n,n.a&2?n.b:(-n.b)&255);
 }else if(n.id===42){dx=horizontal(n,n.b);if(load&&n.b===0)n.b=16;}
 else if(n.id===37){
  if(n.a===0&&n.d===0){n.e=0;if((n.y&255)<n.c){if((counter&7)===0){n.y=yWord(n.y+1);dy=1;}return {dx,dy};}}
  dy=gravity(n,5,3,(n.y&255)>=n.b);
 }else if([38,39,43,44].includes(n.id)){
  const fraction=n.e+n.d;dy=signed(n.a)+(fraction>>8);n.e=fraction&255;n.y=(n.y&~255)|((n.y+dy)&255);
 }else if(n.id===41){if(load)dy=gravity(n,127,2);}
 else if(n.id===36){
  const force=n.d+5,speed=signed(n.a)+(force>>8);
  if(!load&&speed===0&&(force&255)<11){n.a=0;n.d=0;}
  else dy=gravity(n,5,3,load?load<0:speed>=0);
 }
 return {dx,dy};
}

/** Owned by source bank dispatch, never by rendering/collision getters. */
export class NativePlatformClock<Key=object> {
 private objects=new Map<Key,{current:NativePlatformBytes;previous:NativePlatformBytes}>();
 create(key:Key,state:NativePlatformBytes){this.objects.set(key,{current:{...state},previous:{...state}});}
 erase(key:Key){this.objects.delete(key);}
 state(key:Key,previous=false){const n=this.objects.get(key);return n?{...(previous?n.previous:n.current)}:undefined;}
 turn(key:Key,counter:number,run=true,load=0){const n=this.objects.get(key);if(!n)return;n.previous={...n.current};return stepNativePlatform(n.current,counter,run,load);}
}

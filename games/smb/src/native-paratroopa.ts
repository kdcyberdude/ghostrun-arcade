/** Native jumping Paratroopa (id $0E), EnemyJump + DoEnemySideCheck before
 * MoveJ_EnemyVertically/MoveEnemyHorizontally. y is native sprite-top +24. */
export type NativeGreenMotion={x:number;y:number;vx:number;speed:number;force:number;fraction:number};
export function advanceNativeGreenParatroopa(n:NativeGreenMotion,solid:(x:number,y:number)=>boolean){
 const nativeY=(Math.floor(n.y)-24)&255,bg=((nativeY+62)&255)>=68;
 if(bg&&((n.speed+2)&255)>=3&&solid(Math.floor(n.x)+8,n.y)){
  n.y=((Math.floor(n.y)-24)&~15|8)+24;n.speed=-3;n.force=0;
 }
 if(bg&&((Math.floor(n.y)-24)&255)>=32&&solid(Math.floor(n.x)+(n.vx>0?16:0),n.y-4))n.vx=-n.vx;
 const fraction=n.fraction+n.force;n.fraction=fraction&255;n.y+=n.speed+(fraction>>8);
 const v=n.force+28;n.force=v&255;n.speed+=v>>8;
 if(n.speed>=3&&n.force>=128){n.speed=3;n.force=0;}
 n.x+=n.vx;
}

/** Native platform vertical bytes ($A0+s, $0434+s, $0417+s, $CF+s).
 * MovePlatformUp/Down and MoveDropPlatform share ImposeGravity. Position moves
 * before acceleration; InitVStf clears speed and force, preserving fraction. */
export interface PlatformVerticalState {y:number;speed:number;force:number;fraction:number}
function gravity(n:PlatformVerticalState,down:number,max:number,up=false){
 const f=n.fraction+n.force;n.fraction=f&255;n.y=(n.y+n.speed+(f>>8))&255;
 const v=n.force+down;n.force=v&255;n.speed+=v>>8;
 if(n.speed>=max&&n.force>=128){n.speed=max;n.force=0;}
 if(up){const v=n.force-10;n.force=v&255;if(v<0)n.speed--;if(n.speed< -max&&n.force<128){n.speed=-max;n.force=255;}}
}
export function nativeDropStep(n:PlatformVerticalState,loaded:boolean){if(loaded)gravity(n,127,2);}
/** The second balance object owns the motor; the first mirrors its integer
 * displacement. load=-1 is a rider on the first object, +1 on the second. */
export function nativeBalanceStep(n:PlatformVerticalState,load:number){
 const slowed=n.force+5,speed=n.speed+(slowed>>8);
 if(load===0&&speed===0&&(slowed&255)<11){n.speed=0;n.force=0;return;}
 const up=load?load<0:speed>=0;
 gravity(n,5,3,up);
}

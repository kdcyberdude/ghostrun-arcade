/** Native red vertical Paratroopa (id $0F): ProcMoveRedPTroopa and
 * ImposeGravity. y uses the simulation feet convention (native $CF + 24).
 * Original y occupies $0401; the centre occupies $58; gravity uses the
 * inherited $0417 fraction and the cleared $A0/$0434 speed/force bytes. */
export type NativeRedFlight={y:number;speed:number;force:number;fraction:number;originalY:number;centerY:number};
export function createNativeRedFlight(y:number,fraction=0):NativeRedFlight{
 const originalY=(Math.floor(y)-24)&255;
 return {y:Math.floor(y),speed:0,force:0,fraction,originalY,centerY:(originalY+(originalY<128?48:-32))&255};
}
export function advanceNativeRedFlight(n:NativeRedFlight,frameCounter:number){
 const y=(n.y-24)&255;
 if(n.speed===0&&n.force===0){
  n.fraction=0;
  if(y<n.originalY){if((frameCounter&7)===0)n.y++;return;}
 }
 const up=y>=n.centerY,f=n.fraction+n.force;
 n.fraction=f&255;n.y+=n.speed+(f>>8);
 const down=n.force+3;n.force=down&255;n.speed+=down>>8;
 if(n.speed>=2&&n.force>=128){n.speed=2;n.force=0;}
 if(up){
  const v=n.force-6;n.force=v&255;n.speed+=Math.floor(v/256);
  if(n.speed<-2&&n.force<128){n.speed=-2;n.force=255;}
 }
}

import rules from '../data/water-physics-rules.json';

export const WATER_FORCES=rules.parameters;
export interface WaterSurfaceState {active:boolean;contacted:boolean}

// Frozen image-space fit, with its unresolved 3px discrepancies recorded in rules.
export function advanceWater(y:number,vy:number,held:boolean,pressed:boolean,state:WaterSurfaceState){
 const p=WATER_FORCES;
 if(pressed){
  const surfaceStroke=y<p.strokeSurfaceThreshold;
  y=Math.floor(y)+p.freshStrokeYFraction;
  vy=surfaceStroke?p.surfaceStroke:p.stroke;
  if(y>=p.forceExitThreshold)state.active=false;
  else if(y<p.forceEntryThreshold){state.active=true;state.contacted=true;}
 }
 if(vy<0&&y<p.forceEntryThreshold){state.active=true;state.contacted=true;}
 if(vy>=0&&y>=p.forceExitThreshold)state.active=false;
 const gravity=state.active?p.surfaceGravity:state.contacted?p.gravity:held?p.heldGravity:p.gravity;
 return {y,vy:Math.min(p.maxFall,vy+gravity)};
}

// World space: 1 unit = 1 tile = 16 NES px; +X right, +Y up, +Z toward the camera; the gameplay plane is z = 0.
// Simulation space: px, x right, y DOWN (NES screen rows). The window is 256 x 240 px = 16 x 15 units.
export const NES_W=256,NES_H=240;
export const wx=(px:number)=>px/16;
export const wy=(py:number)=>(NES_H-py)/16;

export const FOV=24,PITCH=4.5*Math.PI/180,ASPECT=NES_W/NES_H;
/** Camera distance making the 256px window span sixteen tiles at the gameplay plane. */
export const DIST=8/(ASPECT*Math.tan(FOV*Math.PI/360));
export const TARGET_Y=7.5;

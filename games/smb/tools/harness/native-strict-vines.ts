/** Setup_Vine / VineObjectHandler RAM contract. Enemy-bank objects, not misc-bank objects.
 * The second sprite segment's raw anchor is copied from Block_* by Setup_Vine;
 * it is NOT the drawing anchor (DrawVine uses slot5 relative Y plus $30).
 * The current model has no secondary raw anchor or retained Enemy_State, so
 * those remain explicit gaps instead of inventing zeroes or picture positions. */
export type NativeVineControl={count:number;height:number;startY:number;slots:number[]};
export function nativeVineControl(r:Uint8Array):NativeVineControl{
 const count=r[0x398];return {count,height:r[0x399],startY:r[0x39d],slots:Array.from(r.subarray(0x39a,0x39a+Math.min(count,3)))};
}
export function simVineControl(n:any):NativeVineControl|undefined{
 if(!n||!Array.isArray(n.vineSlots))return;
 return {count:n.vineCount,height:n.vineHeight,startY:n.vineStartY,slots:[...n.vineSlots]};
}

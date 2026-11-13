/** DoFootCheck passes retained Player_MovingDir ($45) to ImpedePlayerMove.
 * Its gate reads the signed $57 byte, not the sign of fractional $0705. */
export function nativeFootImpediment(moving:-1|0|1,speed:number){
 const side=moving===1?1:-1,byte=((Math.floor(speed/256)&255)^128)-128;
 const offset=side===1?(byte>=0?-1:0):((byte-1)&128?1:0);
 return {side:side as -1|1,offset,speed:offset?speed&255:speed};
}

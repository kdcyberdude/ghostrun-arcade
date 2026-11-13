/** GrowThePowerUp precedes the TimerControl gate in PowerUpObjHandler.
 * Y is the native enemy byte, rather than the item's picture Y (+8). */
export function nativePowerupEmergence(state:number,y:number,frame:number){
 if((frame&3)===0){y=(y-1)&255;state=state>=17?128:state+1;}
 return {state,y,emerging:state<128?(18-state)*4-(frame&3):0};
}

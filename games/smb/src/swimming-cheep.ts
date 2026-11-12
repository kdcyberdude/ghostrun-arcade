/** MoveSwimmingCheepCheep: native id $0A/$0B subtracts $40/$80 from x force.
 * Slots 2..4 change y fraction by $20; at a signed 15px displacement from the original low y byte the vertical direction switches.
 * The initial flag is random byte slot & $10 (InitCheepCheep); only frenzy-generated fish clear the y fraction. */
export interface SwimmingCheep{y:number;fraction:number;flag:number;originY:number}
export function moveSwimmingCheep(n:SwimmingCheep,x:number,id:10|11,slot:number){
 x-=id===10?0.25:0.5;
 if(slot>=2){
  const sum=n.fraction+(n.flag<16?-32:32);n.fraction=sum&255;n.y+=Math.floor(sum/256);
  const difference=(((n.y&255)-n.originY+128)&255)-128;
  if(Math.abs(difference)>=15)n.flag=difference<0?16:0;
 }
 return x;
}

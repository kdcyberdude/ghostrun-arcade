/** Native camera for free-play re-seeds: the scroll never goes back, so the camera is the running max of (x - 112) over the area visit.
 * Scans back from `index` through controlled rows of one level while x moves by <= 16 per row (a larger jump is an area change or maze wrap). */
export type CamRow={x:number,engine:number,world:number,stage:number};
export function nativeMaxX(rows:CamRow[],index:number,limit=6000):number{
 let m=-1;
 for(let j=index,n=0;j>=1&&n<limit;j--,n++){
  const a=rows[j],b=rows[j-1];
  if(a.engine!==8||Math.abs(a.x-b.x)>16||a.world!==rows[index].world||a.stage!==rows[index].stage)break;
  if(a.x>m)m=a.x;
 }
 return m;
}

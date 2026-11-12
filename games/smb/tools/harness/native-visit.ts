/** Area-local native x, except a pipe returning to the main area already uses level coordinates.
 * Native return excerpts (explore-r7): 6-2 x568, 8-1 x1848, engine7 y240 ->239.
 * Both are generated main-area pipe destinations; subtracting their page turns either into x56. */
type EntryRow={x:number,y:number,engine:number};
export function nativeVisitOffset(entry:EntryRow,next:EntryRow|undefined,mainReturnXs:readonly number[],respawn=false):number{
 const rising=entry.engine===7&&next?.engine===7&&next.x===entry.x&&((entry.y-next.y)&255)===1;
 if(respawn||(rising&&mainReturnXs.includes(entry.x)))return 0;
 return Math.floor(entry.x/256)*256;
}

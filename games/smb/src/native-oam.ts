/** Final OAM fetch ownership. Transparent CHR, priority and X do not alter the
 * first-eight selection. Row0 of an OAM sprite is drawn on storedY+1. */
export function nativeOamScanlines(oam:ArrayLike<number>,height:8|16=8){
 const rows=Array.from({length:64},()=>0),dropped=Array.from({length:64},()=>0);
 for(let y=0;y<240;y++){let count=0;for(let n=0;n<64;n++){const row=y-(oam[n*4]+1);if(row<0||row>=height)continue;if(count++<8)rows[n]|=1<<row;else dropped[n]|=1<<row;}}
 return {rows,dropped};
}

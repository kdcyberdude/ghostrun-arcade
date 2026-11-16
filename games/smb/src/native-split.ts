/** A late sprite-0 split. When the NMI work before the split outlasts the sprite-0 hit, the scroll writes land after the
 * hit line and the lines below the HUD keep the HUD's scroll. Times are FCEUmm frame dots (the native picture is NeSLE's
 * frame log replayed through FCEUmm's line renderer): `t1` starts the first $2005 write (coarse/fine X), the $2000 write
 * (name-table bit) follows 19 CPU cycles later. Line y applies the writes before y*341+256; its first two tiles are
 * prefetched; the end of the line copies t's coarse X and name-table bit to v. A fine X written during a line moves only the
 * tiles drawn after it. Each segment shows name-table position base+x (mod 512) at screen pixel x; the level's own scroll is
 * the absent case. Evidence: a683d653 1-3 picture 8458 (rows 24-25 at the HUD scroll, row 25 by fine X 2), 3a9d96b1 2-2
 * picture 15379 (row 25 switches to the level scroll from screen x 136), a7990119 2-2 picture 13037 (row 24 with the
 * level's coarse X in name table 0). */
export type SplitSegment={from:number;to:number;base:number};
export const SCROLL_NAMETABLE_WRITE_DOTS=57;
export function lateSplitLines(t1:number,scroll:number){
 const lines:{line:number;segments:SplitSegment[]}[]=[],t3=t1+SCROLL_NAMETABLE_WRITE_DOTS;
 for(let line=32;line<240;line++){
  const copied=(line-1)*341+256;if(t3<copied)break;
  if(t1<copied){lines.push({line,segments:[{from:0,to:256,base:scroll&255}]});continue;}
  if(t1>=line*341+256){lines.push({line,segments:[{from:0,to:256,base:0}]});continue;}
  const split=Math.max(0,Math.min(256,((Math.min(34,(t1+12-(line*341-16))>>3))-2)*8));
  lines.push({line,segments:[{from:0,to:split,base:0},{from:split,to:256,base:scroll&7}].filter(s=>s.to>s.from)});
 }
 return lines;
}

/** Native-vs-remake level-geometry audit (hooked into tools/campaign-compare.ts with GEOAUDIT=1; GEOAUDIT=2 also lists every row).
 * For each native control row whose area matches the remake's it asks the remake's own collision probes (the same ones the
 * simulation uses: walls x+2/x+13 at feet-h+4 and feet-8, feet x+3/x+12, head x+8) what they find at the NATIVE position:
 *  overlap  - a native body overlaps a remake solid cell (the native player is somewhere the remake says is a wall),
 *  throughF - a native fall/rise crossed a remake solid floor/ceiling cell,
 *  noSupport- native stands (vy 0, same y three rows) while the remake probes find no solid below the feet; split into
 *             'wide' (a solid px exists in x-2..x+13: the standing-window question, not geometry) and 'none' (no solid within
 *             x-4..x+16: a missing/misplaced cell or a platform the remake does not have).
 * Output groups the findings by remake cell so single-passage inferences can be counted. Read-only measurement tooling. */
type Row={i:number,x:number,y:number,vx:number,vy:number,engine:number,mode:number,task:number,ram?:string};
type Hit={kind:string,level:string,area:string,cell:string,rows:number[],xs:number[],feet:number};
const hits=new Map<string,Hit>();let audited=0;
const note=(kind:string,level:string,area:string,cell:string,row:number,x:number,feet:number)=>{
 const key=`${kind}|${level}|${area}|${cell}`;
 const h=hits.get(key)??hits.set(key,{kind,level,area,cell,rows:[],xs:[],feet}).get(key)!;
 h.rows.push(row);h.xs.push(x);
};
const cellOf=(sim:any,x:number,y:number)=>{const c=sim.collisionAt(x,y);return c?`${c.piece?'free':c.col!==undefined?'tile':'rect'}(${c.x},${c.y})id${c.id??'-'}`:undefined;};
export function geoAuditRow(sim:any,level:string,n:Row,prev?:Row,next?:Row){
 if((process.env.GEOLEVEL&&process.env.GEOLEVEL!==level)||!prev||n.engine!==8||n.task!==3||n.mode!==1||sim.phase!=='play'||sim.area.theme==='water')return;
 audited++;
 const area=sim.area.id,x=n.x,feet=n.y+32,small=n.ram?.split(',')[6]?.startsWith('01'),h=small?16:32;
 // overlap with a remake wall cell
 for(const y of [feet-h+4,feet-8]){
  // right probe x+12: a wall flush with the player has its edge at x+13 (the simulation snaps to tile.x-13)
  for(const px of [x+12,x+2]){const c=cellOf(sim,px,y);if(c)note('overlap',level,area,c,n.i,x,feet);}
 }
 // crossed a solid floor (falling) or ceiling (rising) cell between the previous and this row
 const pfeet=prev.y+32;
 if(feet>pfeet){for(const px of [x+3,x+12])for(let y=pfeet+1;y<feet;y++){const c=cellOf(sim,px,y);if(c){note('throughF',level,area,c,n.i,x,feet);break;}}}
 if(feet<pfeet){for(let y=feet-h;y<pfeet-h;y++){const c=cellOf(sim,x+8,y);if(c){note('throughC',level,area,c,n.i,x,feet);break;}}}
 // standing where the remake finds no floor
 if(next&&n.vy===0&&prev.vy===0&&prev.y===n.y&&next.y===n.y&&next.vy===0&&!sim.hasSupportAt(x,feet)){
  const near=(a:number,b:number)=>{for(let px=a;px<=b;px++)if(sim.collisionAt(px,feet))return true;return false;};
  // a lift/platform column is under Mario's x: native may stand on it at a height the remake's platform clock does not have
  const platformNear=(sim.area.platforms??[]).some((p:any)=>{const pos=sim.platformMotion.collisionPosition(p,sim.platformFrame-1);return x+3<=pos.x+p.width+2&&x+12>=pos.x-13;});
  note(platformNear?'noSupportPlatformArea':near(x-2,x+13)?'noSupportWide':near(x-4,x+16)?'noSupportNear':'noSupportNone',level,area,`feet${feet}@x${x}`,n.i,x,feet);
 }
}
export function geoAuditReport(detail:boolean){
 console.log(`--- geometry audit: ${audited} native control rows audited ---`);
 const kinds=['overlap','throughF','throughC','noSupportNone','noSupportNear','noSupportWide','noSupportPlatformArea'];
 for(const kind of kinds){
  const list=[...hits.values()].filter(h=>h.kind===kind);
  console.log(`${kind}: ${list.length} groups, ${list.reduce((s,h)=>s+h.rows.length,0)} rows`);
  const merged=kind.startsWith('noSupport')?mergeSupport(list):list;
  for(const h of merged.sort((a,b)=>b.rows.length-a.rows.length).slice(0,detail?400:25))
   console.log(`   ${h.level} ${h.area} ${h.cell} rows ${h.rows.length} first f${h.rows[0]} last f${h.rows[h.rows.length-1]} native x ${Math.min(...h.xs)}..${Math.max(...h.xs)} feet ${h.feet}`);
 }
}
// consecutive noSupport rows of one standing stretch are one finding
function mergeSupport(list:Hit[]){
 const out:Hit[]=[];
 for(const h of [...list].sort((a,b)=>a.rows[0]-b.rows[0])){
  const last=out[out.length-1];
  if(last&&last.level===h.level&&last.feet===h.feet&&h.rows[0]-last.rows[last.rows.length-1]<=3){last.rows.push(...h.rows);last.xs.push(...h.xs);last.cell=`feet${h.feet}@x${Math.min(...last.xs)}..${Math.max(...last.xs)}`;}
  else out.push({...h,rows:[...h.rows],xs:[...h.xs]});
 }
 return out;
}

/** Drift scan (GEODRIFT=1, optional GEOBIN=<px> bin width, default 128): the same native-position-versus-remake-cell findings as geoAuditRow, repeated with the
 * remake map probed at native x + s for s in SHIFTS. A window whose violation count drops sharply at s != 0 holds structures that the screenshot map registered
 * |s| px away from native: s = +16 means the cell native Mario meets at x is the remake cell at x + 16, i.e. the remake structure is 16 px RIGHT of native.
 * Counts rows, not groups; a window needs >= 2 violations at s = 0 to be listed. */
const SHIFTS=[-24,-16,-8,0,8,16,24];
const driftBins=new Map<string,Map<number,number[]>>();
const driftBin=()=>+(process.env.GEOBIN||128);
export function geoDriftRow(sim:any,level:string,n:Row,prev?:Row,next?:Row){
 if((process.env.GEOLEVEL&&process.env.GEOLEVEL!==level)||!prev||!next||n.engine!==8||n.task!==3||n.mode!==1||sim.phase!=='play'||sim.area.theme==='water')return;
 const feet=n.y+32,small=n.ram?.split(',')[6]?.startsWith('01'),h=small?16:32,pfeet=prev.y+32;
 const key=`${level} ${sim.area.id}`,b=Math.floor(n.x/driftBin());
 const bins=driftBins.get(key)??driftBins.set(key,new Map()).get(key)!;
 const counts=bins.get(b)??bins.set(b,SHIFTS.map(()=>0)).get(b)!;
 const rowBad=SHIFTS.map(()=>0);
 SHIFTS.forEach((s,k)=>{
  const x=n.x+s;let bad=0;
  for(const y of [feet-h+4,feet-8])for(const p of [x+12,x+2])if(sim.collisionAt(p,y)){bad++;break;}
  if(feet>pfeet){for(const p of [x+3,x+12]){let hit=false;for(let y=pfeet+1;y<feet;y++)if(sim.collisionAt(p,y)){hit=true;break;}if(hit){bad++;break;}}}
  if(feet<pfeet){for(let y=feet-h;y<pfeet-h;y++)if(sim.collisionAt(x+8,y)){bad++;break;}}
  if(n.vy===0&&prev.vy===0&&prev.y===n.y&&next.y===n.y&&next.vy===0&&!sim.hasSupportAt(x,feet))bad++;
  counts[k]+=bad;
  rowBad[k]=bad;
 });
 // GEOS=<s>: print the rows whose violation count at shift s differs from s = 0 (rows that argue for or against a drift of s px)
 if(process.env.GEOS){const k0=SHIFTS.indexOf(0),k1=SHIFTS.indexOf(+process.env.GEOS);if(rowBad[k0]!==rowBad[k1])console.log(`DR ${level} ${sim.area.id} f${n.i} x${n.x} feet${feet} vy${n.vy}: violations s=0 ${rowBad[k0]}  s=${process.env.GEOS} ${rowBad[k1]}`);}
}
export function geoDriftReport(){
 console.log(`--- drift scan: windows of ${driftBin()} px where probing the remake map at native x + s finds at most half the violations of s = 0 ---`);
 console.log(`shifts ${SHIFTS.join(' ')}`);
 for(const [key,bins] of driftBins)for(const [b,c] of [...bins].sort((p,q)=>p[0]-q[0])){
  const zero=c[SHIFTS.indexOf(0)],best=Math.min(...c),bestS=SHIFTS[c.indexOf(best)];
  if(zero>=2&&best<=zero/2)console.log(`${key.padEnd(12)} x ${b*driftBin()}..${(b+1)*driftBin()-1}  violations by shift ${c.join(' ')}  best s ${bestS}`);
 }
}

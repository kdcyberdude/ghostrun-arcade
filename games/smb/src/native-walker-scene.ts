import type {EnemyKind,EnemySpec} from './types.js';
type Record={offset:number;id:number;x:number;y:number;hard:boolean};
const kinds:Partial<{[id:number]:EnemyKind}>={0:'koopa',2:'beetle',3:'redKoopa',5:'hammerBro',6:'goomba',14:'paratroopa',15:'paratroopa',16:'paratroopa'};
export const ordinaryWalker=(kind:EnemyKind)=>['goomba','koopa','redKoopa','beetle','paratroopa'].includes(kind);
/** Fully supported normal-enemy or walker/group/wrap-lift rooms use physical records, including singles absent from screenshots. */
export function nativeMixedWalkerScene(records:Record[],origin:number,pictures:EnemySpec[]):EnemySpec[]|undefined{
 const group=(id:number)=>id>=0x37&&id<0x3f;
 if(!records.some(r=>kinds[r.id]||group(r.id))||!records.every(r=>kinds[r.id]||group(r.id)||[38,39,52].includes(r.id)))return;
 const palette=(kind:EnemyKind,x:number)=>pictures.filter(e=>e.kind===kind).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0]?.palette;
 return records.flatMap<EnemySpec>(r=>{
  if(group(r.id)){const n=r.id-0x37,kind:EnemyKind=n<4?'goomba':'koopa',count=2+(n&1),y=(n&2?0x70:0xb0)+32,column=r.x+origin;
   return Array.from({length:count},(_,index)=>({kind,x:column-48+index*24,y,direction:-1,palette:palette(kind,column),nativeGroup:{offset:r.offset,column,index,count}}));
  }
  const kind=kinds[r.id];if(!kind)return [];
  return [{kind,x:r.x+origin,y:r.y+24,direction:-1,palette:palette(kind,r.x+origin),nativeId:r.id,nativeOffset:r.offset,nativeColumn:r.x+origin,...(kind==='paratroopa'?{paratroopaMotion:r.id===15?'vertical' as const:r.id===16?'horizontal' as const:'bounce' as const}:{})}];
 });
}

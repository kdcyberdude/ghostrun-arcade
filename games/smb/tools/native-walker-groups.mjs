/** Project a physical ROM enemy stream into one compiled scene. */
export function nativeWalkerScene(layout,{level,area,offset,width,source}){
 const shift=(items,key)=>items.map(item=>({...item,[key]:item[key]+offset})).filter(item=>item[key]>=0&&item[key]<width);
 return {level,area,pointer:layout.pointer,label:layout.label,...(layout.bytes?{bytes:layout.bytes}:{}),singles:shift(layout.singles??[],'x'),groups:shift(layout.groups,'column'),sceneOffset:offset,source};
}
/** Associate screenshot actors with native group objects at build time. The
 * runtime uses only raw columns, counts, slot order and the current camera. */
export function applyNativeWalkerGroups(levels,layouts){
 for(const layout of layouts){
  const area=levels.find(l=>l.id===layout.level)?.areas.find(a=>a.id===layout.area);
  if(!area)throw Error(`Missing native group area ${layout.level}/${layout.area}`);
  area.enemies=area.enemies.filter(e=>!e.evidence?.startsWith('Native enemy-data group member;'));
  const pictures=area.enemies;
  if(layout.sceneOffset!==undefined){
   if(layout.bytes)area.nativeWalkerStream={bytes:layout.bytes,offset:layout.sceneOffset};
   const kinds=['goomba','koopa','redKoopa','beetle','paratroopa'];
   area.enemies=area.enemies.filter(e=>!kinds.includes(e.kind));
   for(const single of layout.singles??[]){
    const picture=pictures.filter(e=>e.kind===single.kind).sort((a,b)=>Math.abs(a.x-single.x)-Math.abs(b.x-single.x))[0];
    area.enemies.push({kind:single.kind,x:single.x,y:single.y,direction:-1,palette:picture?.palette,...(single.kind==='paratroopa'?{paratroopaMotion:single.id===15?'vertical':single.id===16?'horizontal':'bounce'}:{}),evidence:`Native ROM ${layout.label} enemy record${single.offset}; scene origin${layout.sceneOffset}.`});
   }
  }

  for(const e of area.enemies){delete e.nativeGroup;delete e.nativeColumn;delete e.nativeId;delete e.nativeOffset;}
  const assigned=new Map(layout.groups.map(g=>[g,[]]));
  for(const e of area.enemies){
   const single=layout.singles?.find(s=>s.kind===e.kind&&s.x===e.x);
   if(single){e.y=single.y;e.nativeColumn=single.x;e.nativeId=single.id;e.nativeOffset=single.offset;continue;}
   const candidates=layout.groups.filter(g=>e.kind===g.kind&&e.x>=g.column-48&&e.x<=g.column+24*(g.count-1));
   const distance=g=>e.spawnCamera===undefined?Math.min(...Array.from({length:g.count},(_,i)=>Math.abs(e.x-(g.column-48+i*24)))):Math.max(g.column-303-e.spawnCamera,0,e.spawnCamera-(g.column-255));
   candidates.sort((a,b)=>distance(a)-distance(b));
   if(candidates.length)assigned.get(candidates[0]).push(e);
  }
  for(const group of layout.groups){
   const members=assigned.get(group).sort((a,b)=>a.x-b.x);
   if(members.length>group.count)throw Error(`Too many native group members ${layout.level}/${layout.area}/${group.column}`);
   for(let i=0;i<group.count;i++){
    let e=members[i];
    if(!e){e={kind:group.kind,x:group.column-48+i*24,y:group.y,direction:-1,spawnCamera:group.column-303,palette:members[0]?.palette??pictures.find(e=>e.kind===group.kind)?.palette,evidence:'Native enemy-data group member; made only if a slot is free at the group parser pass.'};area.enemies.push(e);}
    e.y=group.y;e.nativeGroup={offset:group.offset,column:group.column,index:i,count:group.count};
   }
  }
 }
}

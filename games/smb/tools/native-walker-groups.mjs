/** Associate screenshot actors with native group objects at build time. The
 * runtime uses only raw columns, counts, slot order and the current camera. */
export function applyNativeWalkerGroups(levels,layouts){
 for(const layout of layouts){
  const area=levels.find(l=>l.id===layout.level)?.areas.find(a=>a.id===layout.area);
  if(!area)throw Error(`Missing native group area ${layout.level}/${layout.area}`);
  area.enemies=area.enemies.filter(e=>!e.evidence?.startsWith('Native enemy-data group member;'));
  for(const e of area.enemies){delete e.nativeGroup;delete e.nativeColumn;}
  const assigned=new Map(layout.groups.map(g=>[g,[]]));
  for(const e of area.enemies){
   const single=layout.singles?.find(s=>s.kind===e.kind&&s.x===e.x&&s.y===e.y);
   if(single){e.nativeColumn=single.x;continue;}
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
    if(!e){e={kind:group.kind,x:group.column-48+i*24,y:group.y,direction:-1,spawnCamera:group.column-303,palette:members[0]?.palette,evidence:'Native enemy-data group member; made only if a slot is free at the group parser pass.'};area.enemies.push(e);}
    e.y=group.y;e.nativeGroup={column:group.column,index:i,count:group.count};
   }
  }
 }
}

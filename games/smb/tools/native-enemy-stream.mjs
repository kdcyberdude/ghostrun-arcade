/** Native ProcessEnemyData page controls. A row-$0F entry becomes an object when its second byte already selected the next page. */
export function nativeEnemyStream(bytes,secondaryHardMode=false){
 const objects=[];let page=0,selected=false;
 for(let offset=0;offset<bytes.length&&bytes[offset]!==255;){
  const first=bytes[offset],second=bytes[offset+1],row=first&15;
  if(second&128&&!selected){page++;selected=true;}
  if(row===15&&!selected){page=second&63;selected=true;offset+=2;continue;}
  if(row!==14&&(!(second&64)||secondaryHardMode))objects.push({id:second&63,x:page*256+(first&240),y:row*16+8,offset});
  offset+=row===14?3:2;selected=false;
 }
 return objects;
}

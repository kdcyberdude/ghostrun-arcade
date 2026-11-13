/** Read one immutable ROM enemy byte stream from either disassembly dialect. */
export function nativeEnemyBytes(source,label){
 const start=source.indexOf(label+':');if(start<0)throw Error(`Missing ${label}`);const bytes=[];
 for(const line of source.slice(start+label.length+1).split('\n')){
  const data=line.split(';')[0].match(/\.(?:byte|db)\s+(.+)/);if(!data)continue;
  for(const part of data[1].split(',')){if(!/^\s*\$[0-9a-f]+\s*$/i.test(part))throw Error(`Non-byte operand ${part}`);const byte=parseInt(part.trim().slice(1),16);bytes.push(byte);if(byte===255)return bytes;}
 }
 throw Error(`Unterminated ${label}`);
}
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

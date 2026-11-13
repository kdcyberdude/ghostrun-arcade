/** Read an immutable labelled byte block without interpreting operand bytes as stream terminators. */
export function nativeSourceBytes(source,label){
 const start=source.indexOf(label+':');if(start<0)throw Error(`Missing ${label}`);
 const tail=source.slice(start+label.length+1),next=tail.search(/^\w+:/m),bytes=[];
 for(const line of (next<0?tail:tail.slice(0,next)).split('\n')){
  const data=line.split(';')[0].match(/\.(?:byte|db)\s+(.+)/);if(!data)continue;
  for(const part of data[1].split(',')){if(!/^\s*\$[0-9a-f]+\s*$/i.test(part))throw Error(`Non-byte operand ${part}`);bytes.push(parseInt(part.trim().slice(1),16));}
 }
 return bytes;
}

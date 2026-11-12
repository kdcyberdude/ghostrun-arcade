/** Extract every engine11 death arc through its engine6 exit. Game reads no fixture data.
 * node tools/harness/native-death-arcs.mjs --traces DIR --output tests/fixtures/native-death-arcs.json */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},output:{type:'string'}}});if(!a.traces||!a.output)throw Error('--traces and --output required');
const cases=[],pose=r=>[r[0xb5]*256+r[0xce]-224,r[0x416],(r[0x9f]<<24)>>24,r[0x433],r[14]];
for(const level of fs.readdirSync(a.traces).sort()){
 const bytes=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<bytes.length/2048;frame++){
  const r=bytes.subarray(frame*2048,(frame+1)*2048);if(r[14]!==11||bytes[(frame-1)*2048+14]===11)continue;
  const rows=[];let end=frame+1;
  while(end<bytes.length/2048&&bytes[end*2048+14]===11)rows.push(pose(bytes.subarray(end++*2048,end*2048)));
  if(end>=bytes.length/2048||bytes[end*2048+14]!==6)continue;rows.push(pose(bytes.subarray(end*2048,(end+1)*2048)));
  cases.push({level,frame,initial:pose(r),rows});
 }
}
fs.writeFileSync(a.output,'{"method":"Native engine11 arcs; rows=[remakeFeetY,YMF_Dummy,signedYSpeed,MoveForce,engine]. Addresses in tools/harness/native-death-arcs.mjs.","cases":[\n'+cases.map(c=>JSON.stringify(c)).join(',\n')+'\n]}\n');console.log(cases.length+' arcs');

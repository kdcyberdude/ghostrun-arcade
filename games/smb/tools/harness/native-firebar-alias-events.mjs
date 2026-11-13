/** Capture DuplicateEnemyObj/EnemiesAndLoopsCore long-firebar alias flags and raw copied anchors. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');const runs=[];
for(const level of fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const ram=fs.readFileSync(path.join(a.traces,level,'ram.bin')),rows=[];let last=-1;
 for(let frame=0;frame<ram.length/2048;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048),aliases=[];
  for(let slot=0;slot<6;slot++){const flag=r[15+slot],owner=flag&127;if(!(flag&128)||owner>=5||r[22+owner]!==31)continue;
   aliases.push({slot,flag,owner,x:r[110+slot]*256+r[135+slot],y:(r[182+slot]-1)*256+r[207+slot]});
  }
  if(aliases.length)last=frame;rows.push({frame,aliases});
 }
 if(last>=0)runs.push({level,rows:rows.slice(0,last+2)});
}
fs.writeFileSync(a.out,JSON.stringify({source:'Native PRG0 DuplicateEnemyObj copies pre-InitShortFirebar raw X/Y and flags the lowest free slot with128|owner. All rows from entrance through final alias erasure retained.',runs})+'\n');console.log(runs.map(r=>[r.level,r.rows.length]));

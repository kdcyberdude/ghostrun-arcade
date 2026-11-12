/** Native DrawSmallPlatform positions (IDs43/44), using the pre-movement Y byte and OAM selected by $06E5+s.
 * node tools/harness/native-small-platform-pictures.mjs --traces DIR [--out tests/fixtures/native-small-platform-pictures.json]
 * Horizontal clipping is excluded; HUD and vertical wrapping remain part of the evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-small-platform-pictures.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={source:'Native v2 RAM: small platform IDs43/44, previous Enemy_Y_Position $CF+s, and current first/fourth OAM sprites via $06E5+s; tuples [frame,firstArtworkY,firstOamY,secondOamY]',checked:0,levels:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file),rows=[];let previous='';
 for(let f=1;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),p=d.subarray((f-1)*2048,f*2048);
  if(r[14]!==8||r[0x747]!==0||r[0x770]!==1)continue;
  for(let s=0;s<5;s++){
   if(r[15+s]!==1||p[15+s]!==1||![43,44].includes(r[22+s])||p[22+s]!==r[22+s])continue;
   const x=p[0x6e+s]*256+p[0x87+s]-r[0x71a]*256-r[0x71c],o=0x200+r[0x6e5+s];
   if(x<1||x>223||r[o+3]!==x)continue;
   const row=[f,p[0xcf+s]+1,r[o],r[o+12]],key=JSON.stringify(row.slice(1));out.checked++;
   if(key!==previous)rows.push(row);previous=key;
  }
 }
 if(rows.length)out.levels.push({level,rows});
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`${out.checked} native small-platform pictures`);

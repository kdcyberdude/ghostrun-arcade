/** Extract RetainerObject positions from native enemy streams, using static ROM scene origins.
 * npx tsx tools/harness/native-retainers.ts --rom game.nes [--out data/native-retainers.json]
 * ROM contents are never stored: only command addresses and level geometry metadata. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import catalog from '../../data/native-area-catalog.json';
import {observedLevels} from '../../src/levels.js';
import {nativeAreaBindings} from './native-area-identity.js';
export function decodeRetainers(rom:Uint8Array,pointer:number){
 const out:{x:number;offset:number}[]=[];let page=0,selected=false;
 for(let offset=0;offset<256;){
  const at=16+pointer-0x8000+offset,a=rom[at];if(a===255)break;
  const b=rom[at+1],row=a&15;if(b&128&&!selected){page++;selected=true;}
  if(row===15&&!selected){page=b&63;selected=true;offset+=2;continue;}
  if(row===14){offset+=3;selected=false;continue;}
  if((b&63)===0x35)out.push({x:page*256+(a&240),offset});
  offset+=2;selected=false;
 }
 return out;
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{rom:{type:'string'},out:{type:'string',default:'data/native-retainers.json'}}});if(!a.rom)throw Error('--rom required');
 const rom=new Uint8Array(fs.readFileSync(a.rom)),sha256=createHash('sha256').update(rom).digest('hex');if(sha256!==catalog.source.sha256)throw Error('ROM differs from the native area catalog');
 const areas=[];
 for(const level of observedLevels())for(const binding of nativeAreaBindings(level).bindings){
  const area=level.areas.find(a=>a.id===binding.area)!;if(area.exit?.kind!=='axe')continue;
  const pointer=(catalog.areas as Record<string,{enemy:number}>)[String(binding.code)].enemy;
  for(const object of decodeRetainers(rom,pointer)){const x=object.x+binding.offset;if(x>=0&&x<area.width)areas.push({level:level.id,area:area.id,x,nativeX:object.x,pointer,offset:object.offset,origin:binding.offset});}
 }
 fs.writeFileSync(a.out!,JSON.stringify({romSha256:sha256,source:'ProcessEnemyData RetainerObject $35; positions from native enemy streams, scene origins from ROM world/portal bindings. InitRetainerObj fixes Y=$b8.',areas},null,1)+'\n');console.log(`${areas.length} native retainers`);
}

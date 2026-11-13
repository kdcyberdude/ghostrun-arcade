/** CastleObject (row15/type2) creates ID49 at residual length2, two columns after its start. */
import fs from 'node:fs';import {parseArgs} from 'node:util';import {createHash} from 'node:crypto';
import {observedLevels} from '../../src/levels.js';import {nativeAreaBindings} from './native-area-identity.js';
const {values:a}=parseArgs({options:{rom:{type:'string'},out:{type:'string',default:'data/native-castle-flags.json'}}});if(!a.rom)throw Error('--rom required');
const rom=fs.readFileSync(a.rom),areas=[];
for(const level of observedLevels())for(const b of nativeAreaBindings(level).bindings){
 const objects=[];let page=0;
 for(let offset=0;offset<1024;offset+=2){
  const first=rom[16+b.data-0x8000+offset],second=rom[16+b.data-0x8000+offset+1];if(first===253)break;
  if(second&128)page++;const row=first&15;
  if(row===13&&!(second&64)){page=second&31;continue;}
  if(row!==15||(second&112)!==32)continue;
  const nativeColumn=page*16+(first>>4)+2;if(nativeColumn<16)continue;
  objects.push({column:nativeColumn*16+b.offset,row:second&15,offset});
 }
 if(objects.length)areas.push({level:level.id,area:b.area,pointer:b.data,origin:b.offset,objects});
}
fs.writeFileSync(a.out!,JSON.stringify({source:'ROM CastleObject row15/type2; residual length2 after fixedlength4; page0 does not spawn. Binding offsets come from static ROM portals, never recorded poses.',romSha256:createHash('sha256').update(rom).digest('hex'),areas},null,1)+'\n');console.log(`${areas.length} bound castle streams,${areas.reduce((n,a)=>n+a.objects.length,0)} ID49 columns`);

/** Source-only Piranha Plant (VerticalPipe -> enemy13) declarations.
 * npx tsx tools/harness/native-piranha-layout.ts --source DISASSEMBLY [--out FILE] */
import fs from 'node:fs';
import {nativeSourceBytes} from '../native-source-bytes.mjs';
import {parseArgs} from 'node:util';
import type {Level} from '../../src/types.js';
import {nativeAreaBindings} from './native-area-identity.js';
import {nativePhysicalAreas} from '../../src/native-area-catalog.js';
import catalog from '../../data/native-area-catalog.json';
const {values:a}=parseArgs({options:{source:{type:'string'},out:{type:'string',default:'data/native-piranhas.json'}}});
if(!a.source)throw Error('--source is required');
const source=fs.readFileSync(a.source,'utf8'),levels=JSON.parse(fs.readFileSync('data/levels.json','utf8')) as Level[];
const labels=[...source.slice(source.indexOf('AreaDataAddrLow:'),source.indexOf('AreaDataAddrHigh:')).matchAll(/<([A-Za-z0-9_]+)/g)].map(m=>m[1]);
const areas:{level:string;area:string;source:{pointer:number;offset:number}[];kills:{column:number;offset:number}[];plants:{x:number;y:number;offset:number;bytes:number[];pointer:number}[]}[]=[];
for(const level of levels)for(const binding of nativeAreaBindings(level).bindings){
 const area=level.areas.find(a=>a.id===binding.area)!,label=labels[[0,3,25,28][binding.code>>5&3]+(binding.code&31)],bytes=nativeSourceBytes(source,label),pointer=nativePhysicalAreas[binding.code].data;let page=0;
 const plants:{x:number;y:number;offset:number;bytes:number[];pointer:number}[]=[],kills:{column:number;offset:number}[]=[];
 for(let i=2;i<bytes.length&&bytes[i]!==0xfd;i+=2){
  const first=bytes[i],second=bytes[i+1],row=first&15;
  if(second&128)page++;
  if(row===13&&!(second&64)){page=second&31;continue;}
  const column=page*256+(first&240)+binding.offset;
  if(row===13&&(second&0x7f)===0x45&&column>=0)kills.push({column,offset:i-2});
  if((Number(level.id[0])-1|Number(level.id[2])-1)===0||row>=12||(second&0x70)!==0x70)continue;
  const y=row*16+56;
  if(column>=0&&column<area.width)plants.push({x:column+8,y:y-24,offset:i-2,bytes:[first,second],pointer});
 }
 areas.push({level:level.id,area:area.id,source:[{pointer,offset:binding.offset/16}],kills,plants});
}
const result={romSha256:catalog.source.sha256,source:'Native ROM VerticalPipe: x=column*16+8,y=row*16+32; InitPiranhaPlant down=y,up=y-24. Native WorldNumber|AreaNumber zero suppresses plants. Area bindings come from ROM world routes and portal destinations.',areas};
fs.writeFileSync(a.out,JSON.stringify(result,null,2)+'\n');
console.log(`${areas.length} areas, ${areas.reduce((n,a)=>n+a.plants.length,0)} native Piranha declarations`);

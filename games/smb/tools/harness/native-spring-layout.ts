/** Source-only Jumpspring (small area object11 -> enemy50) declarations.
 * npx tsx tools/harness/native-spring-layout.ts --source DISASSEMBLY [--apply] */
import fs from 'node:fs';
import {parseArgs} from 'node:util';
import type {Level} from '../../src/types.js';
import {nativeAreaBindings} from './native-area-identity.js';
import {applyNativeSprings} from '../native-springs.mjs';
import catalog from '../../data/native-area-catalog.json';
const {values:a}=parseArgs({options:{source:{type:'string'},out:{type:'string',default:'data/native-spring-layout.json'},apply:{type:'boolean',default:false}}});
if(!a.source)throw Error('--source is required');
const source=fs.readFileSync(a.source,'utf8'),levels=JSON.parse(fs.readFileSync('data/levels.json','utf8')) as Level[];
const labels=[...source.slice(source.indexOf('AreaDataAddrLow:'),source.indexOf('AreaDataAddrHigh:')).matchAll(/<([A-Za-z0-9_]+)/g)].map(m=>m[1]);
function bytesAt(label:string){
 const found=source.indexOf(label+':');if(found<0)throw Error(`Missing ${label}`);
 const tail=source.slice(found+label.length+1),next=tail.search(/^\w+:/m),bytes:number[]=[];
 for(const line of (next<0?tail:tail.slice(0,next)).split('\n')){
  const data=line.split(';')[0].match(/\.(?:byte|db)\s+(.+)/);if(!data)continue;
  for(const part of data[1].split(',')){if(!/^\s*\$[0-9a-f]+\s*$/i.test(part))throw Error(`Non-byte operand ${part}`);bytes.push(parseInt(part.trim().slice(1),16));}
 }
 return bytes;
}
const springs:{level:string;area:string;code:number;label:string;offset:number;column:number;y:number}[]=[];
for(const level of levels)for(const binding of nativeAreaBindings(level).bindings){
 const area=level.areas.find(a=>a.id===binding.area)!,label=labels[[0,3,25,28][binding.code>>5&3]+(binding.code&31)],bytes=bytesAt(label);let page=0;
 for(let i=2;i<bytes.length&&bytes[i]!==0xfd;i+=2){
  const first=bytes[i],second=bytes[i+1],row=first&15;
  if(second&128)page++;
  if(row===13&&!(second&64)&&!(second&128)){page=second&31;continue;}
  if(row>=12||(second&127)!==11)continue;
  const column=page*256+(first&240)+binding.offset,y=row*16+56;
  if(column>=0&&column<area.width)springs.push({level:level.id,area:area.id,code:binding.code,label,offset:i-2,column,y});
 }
}
const result={source:{sha256:catalog.source.sha256,method:'Native AreaData small-object11 Jumpspring; source scene bindings; native y=encoded row*16+32, compiled feet+24.'},springs};
fs.writeFileSync(a.out,JSON.stringify(result,null,1)+'\n');
if(a.apply){applyNativeSprings(levels,springs);const temporary=`data/.levels-${process.pid}.json`;fs.writeFileSync(temporary,JSON.stringify(levels,null,2)+'\n');fs.renameSync(temporary,'data/levels.json');}
console.log(`${springs.length} native Spring declarations`);

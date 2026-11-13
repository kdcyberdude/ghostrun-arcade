/** Source-only Bullet Bill Cannon (AreaStyleObject with AreaStyle2) declarations.
 * npx tsx tools/harness/native-cannon-layout.ts --source DISASSEMBLY [--apply] */
import fs from 'node:fs';
import {nativeEnemyBytes} from '../native-enemy-stream.mjs';
import {parseArgs} from 'node:util';
import type {Level} from '../../src/types.js';
import {nativeAreaBindings} from './native-area-identity.js';
import {applyNativeCannons} from '../native-cannons.mjs';
import catalog from '../../data/native-area-catalog.json';
const {values:a}=parseArgs({options:{source:{type:'string'},out:{type:'string',default:'data/native-cannon-layout.json'},apply:{type:'boolean',default:false}}});
if(!a.source)throw Error('--source is required');
const source=fs.readFileSync(a.source,'utf8'),levels=JSON.parse(fs.readFileSync('data/levels.json','utf8')) as Level[];
const labels=[...source.slice(source.indexOf('AreaDataAddrLow:'),source.indexOf('AreaDataAddrHigh:')).matchAll(/<([A-Za-z0-9_]+)/g)].map(m=>m[1]);
const cannons:{level:string;area:string;code:number;label:string;offset:number;column:number;y:number}[]=[];
for(const level of levels)for(const binding of nativeAreaBindings(level).bindings){
 const area=level.areas.find(a=>a.id===binding.area)!,label=labels[[0,3,25,28][binding.code>>5&3]+(binding.code&31)],bytes=nativeEnemyBytes(source,label);let page=0;
 for(let i=2;i<bytes.length&&bytes[i]!==0xfd;i+=2){
  const first=bytes[i],second=bytes[i+1],row=first&15;
  if(second&128)page++;
  if(row===13&&!(second&64)&&!(second&128)){page=second&31;continue;}
  if((bytes[1]>>6)!==2||row>=12||(second&0x70)!==0x10)continue;
  const column=page*256+(first&240)+binding.offset,y=row*16+32;
  if(column>=0&&column<area.width)cannons.push({level:level.id,area:area.id,code:binding.code,label,offset:i-2,column,y});
 }
}
const result={source:{sha256:catalog.source.sha256,method:'Native AreaStyleObject1 with header AreaStyle2 -> BulletBillCannon/SetupCannon; source scene bindings; Cannon_Y_Position=encoded row*16+32.'},cannons};
fs.writeFileSync(a.out,JSON.stringify(result,null,1)+'\n');
if(a.apply){applyNativeCannons(levels,cannons);const temporary=`data/.levels-${process.pid}.json`;fs.writeFileSync(temporary,JSON.stringify(levels,null,2)+'\n');fs.renameSync(temporary,'data/levels.json');}
console.log(`${cannons.length} native Cannon declarations`);

/** Extract small native area-address and portal metadata, never a ROM payload.
 * node tools/harness/native-area-catalog.mjs --rom /path/SMB.nes --out data/native-area-catalog.json
 * GetAreaDataAddrs indexes the ROM tables by AreaPointer & $1f and (AreaPointer >> 5) & 3; RAM $e7/$e8 is stream+2.
 * ParseRow0e stores the destination AreaPointer and EntrancePage from three-byte enemy-stream commands. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{rom:{type:'string'},out:{type:'string',default:'data/native-area-catalog.json'}}});
if(!a.rom)throw Error('--rom required');
const rom=fs.readFileSync(a.rom),sha256=createHash('sha256').update(rom).digest('hex');
if(sha256!=='f61548fdf1670cffefcc4f0b7bdcdd9eaba0c226e3b74f8666071496988248de')throw Error('Expected the retained native PRG0 reference ROM');
const prg=rom.subarray(16,16+32768),byte=addr=>prg[addr-0x8000];
const unique=bytes=>{const b=Buffer.from(bytes),i=prg.indexOf(b);if(i<0||prg.indexOf(b,i+1)>=0)throw Error('Native table signature not unique');return 0x8000+i;};
const worldAreas=unique([0x25,0x29,0xc0,0x26,0x60]),worldOffsets=worldAreas-8,enemyH=worldAreas+36,enemyLow=enemyH+4,enemyHigh=enemyLow+34;
const areaH=unique([0,3,25,28]),areaLow=areaH+4,areaHigh=areaLow+34;
if(areaH!==enemyHigh+34)throw Error('Native address-table layout changed');
const word=(low,high,index)=>byte(low+index)+byte(high+index)*256;
const areas={};
for(let type=0;type<4;type++)for(let index=0;index<[3,22,3,6][type];index++){
 const code=(type<<5)|index,address=word(areaLow,areaHigh,byte(areaH+type)+index),enemyAddress=word(enemyLow,enemyHigh,byte(enemyH+type)+index);
 const portals=[];let page=0,selected=false;
 for(let offset=0;offset<256&&byte(enemyAddress+offset)!==255;){
  const first=byte(enemyAddress+offset),second=byte(enemyAddress+offset+1),row=first&15;
  if(second&128&&!selected){page++;selected=true;}
  if(row===15&&!selected){page=second&63;selected=true;offset+=2;continue;}
  if(row===14){const third=byte(enemyAddress+offset+2);portals.push({x:page*256+(first&240),destination:second&127,world:third>>5,page:third&31,offset});}
  offset+=row===14?3:2;selected=false;
 }
 areas[code]={code,type,index,data:address+2,enemy:enemyAddress,header:[byte(address),byte(address+1)],portals};
}
const worlds=Array.from({length:8},(_,w)=>{
 const from=byte(worldOffsets+w),to=w<7?byte(worldOffsets+w+1):36;
 return Array.from({length:to-from},(_,i)=>byte(worldAreas+from+i)&127);
});
fs.writeFileSync(a.out,JSON.stringify({schema:'native-area-catalog-v1',source:{sha256,method:'Native PRG0 ROM WorldAddrOffsets/AreaAddrOffsets, GetAreaDataAddrs tables and ParseRow0e. Addresses/headers/portal metadata only; no ROM stored.',tables:{worldOffsets,worldAreas,enemyH,enemyLow,enemyHigh,areaH,areaLow,areaHigh}},worlds,areas},null,1)+'\n');
console.log(`Wrote ${Object.keys(areas).length} native physical areas and eight world routes`);

/** Native group-birth events, keyed by raw EnemyDataOffset $0739 and page
 * $073A. Inputs: pre-pass free slots, inherited $0401 bytes, current camera;
 * outputs: every newly occupied group's slot and exact x/y. Only normal
 * predecessor objects with a known horizontal-fraction writer are admitted.
 * node tools/harness/native-walker-group-events.mjs --traces DIR
 * [--out tests/fixtures/native-walker-group-events.json] */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-walker-group-events.json'}}});
if(!a.traces)throw Error('--traces is required');
const layouts=JSON.parse(fs.readFileSync('data/native-walker-groups.json','utf8')),events=[];
for(const layout of layouts){
 const bytes=fs.readFileSync(path.join(a.traces,layout.level,'ram.bin'));
 for(let f=1;f<bytes.length/2048;f++){
  const p=bytes.subarray((f-1)*2048,f*2048),r=bytes.subarray(f*2048,(f+1)*2048);
  if(p[0xe]!==8||r[0xe]!==8||p[0xe9]!==r[0xe9]||p[0xea]!==r[0xea])continue;
  for(const group of layout.groups){
   if(p[0x739]!==group.offset||r[0x739]!==group.offset+2||r[0x73a]!==group.column>>8)continue;
   const camera=r[0x71a]*256+r[0x71c],kind=group.kind==='goomba'?6:0,born=[];
   for(let s=0;s<5;s++)if(r[0xf+s]===1&&r[0x16+s]===kind){
    const x=r[0x6e+s]*256+r[0x87+s]+r[0x401+s]/256,oldX=p[0x6e+s]*256+p[0x87+s]+p[0x401+s]/256;
    if((!p[0xf+s]||p[0x16+s]!==kind||Math.abs(x-oldX)>64)&&x-camera>=254&&x-camera<=304&&r[0xcf+s]+24===group.y)born.push({slot:s,x,y:group.y});
   }
   if(!born.length||born.length>group.count)continue;
   const slots=new Set(born.map(b=>b.slot)),free=[0,1,2,3,4].filter(s=>!p[0xf+s]);if(!free.length)continue;
   // A second unrelated creation (e.g. ProcessCannons) would hide the earlier free-slot mask.
   if([0,1,2,3,4].some(s=>!slots.has(s)&&r[0xf+s]&&!p[0xf+s]))continue;
   const sub=[0,1,2,3,4].map(s=>p[0x401+s]);let supported=true;
   for(const b of born)if(p[0xf+b.slot]){
    const s=b.slot,id=p[0x16+s],state=p[0x1e+s];
    if(![0,1,2,3,4,6].includes(id)||state>1){supported=false;break;}
    const speed=p[0x58+s]<128?p[0x58+s]:p[0x58+s]-256;sub[s]=(sub[s]+speed*16)&255;
   }
   if(!supported)continue;
   events.push({level:layout.level,row:f,column:group.column,count:group.count,kind:group.kind,y:group.y,camera,parserSlot:free[0],sub,before:[0,1,2,3,4].map(s=>Boolean(p[0xf+s])),occupied:[0,1,2,3,4].filter(s=>r[0xf+s]&&!slots.has(s)),born:born.sort((a,b)=>a.x-b.x)});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(events).replace(/\{"level"/g,'\n{"level"')+'\n');
console.log(`${events.length} supported native group births`);

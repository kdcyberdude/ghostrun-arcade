/** Native VerticalPipe/InitPiranhaPlant actor data. No tile edits.
 * npx tsx tools/harness/native-pipes.ts --rom ROM --traces DIR
 * Source area pointers/geometry offsets come from native-area-controls.ts's block-buffer match. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import controls from '../../data/native-area-controls.json';
import levels from '../../data/levels.json';
export function decodeNativePipes(rom:Uint8Array,pointer:number){
 const plants:{x:number;y:number;offset:number;bytes:number[]}[]=[];let page=0;
 for(let offset=0;offset<256;offset+=2){
  const at=16+pointer-0x8000+offset,a=rom[at];if(a===0xfd)break;
  const b=rom[at+1];if(b&0x80)page++;
  if((a&15)===13&&!(b&0x40)){page=b&31;continue;}
  if((a&15)<12&&(b&0x70)===0x70)plants.push({x:page*256+(a&240)+8,y:(a&15)*16+32,offset,bytes:[a,b]});
 }
 return plants;
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{rom:{type:'string'},traces:{type:'string'},out:{type:'string',default:'data/native-piranhas.json'},births:{type:'string',default:'tests/fixtures/native-pipe-births.json'}}});
 if(!a.rom||!a.traces)throw Error('--rom and --traces required');
 const rom=new Uint8Array(fs.readFileSync(a.rom));
 if(createHash('sha256').update(rom).digest('hex')!==controls.romSha256)throw Error('ROM differs from native area pointer evidence');
 const areas=controls.areas.map(area=>({...area,commands:undefined,plants:area.level==='1-1'?[]:area.source.flatMap(s=>decodeNativePipes(rom,s.pointer).map(p=>({...p,x:p.x+s.offset*16,pointer:s.pointer}))).filter((p,i,all)=>p.x>=0&&p.x<(levels.find(l=>l.id===area.level)!.areas.find(a=>a.id===area.area)!.width)&&all.findIndex(q=>q.x===p.x&&q.y===p.y)===i)}));
 fs.writeFileSync(a.out!,JSON.stringify({romSha256:controls.romSha256,source:'Native ROM VerticalPipe: x=column*16+8,y=row*16+32; InitPiranhaPlant down=y,up=y-24. Native1-1 suppresses pipe plants. Geometry offsets are source area mappings, not fitted motor constants.',areas},null,2)+'\n');
 const births=[];
 for(const level of fs.readdirSync(a.traces)){
  const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
  const ram=fs.readFileSync(file),initial=fs.readFileSync(path.join(a.traces,level,'initial.ram'));
  for(let f=0;f<ram.length/2048;f++){
   const r=ram.subarray(f*2048,(f+1)*2048),p=f?ram.subarray((f-1)*2048,f*2048):initial;
   if(r[0x770]!==1||`${r[0x75f]+1}-${r[0x75c]+1}`!==level)continue;
   for(let slot=0;slot<5;slot++)if(r[15+slot]&&r[22+slot]===13&&(!p[15+slot]||p[22+slot]!==13||r[0x6e+slot]!==p[0x6e+slot]||r[0x87+slot]!==p[0x87+slot]))births.push({level,row:f,slot,flags:Array.from(r.subarray(15,20)),pointer:r[0xe7]+r[0xe8]*256,x:r[0x6e+slot]*256+r[0x87+slot],y:r[0xcf+slot],down:r[0x434+slot],up:r[0x417+slot],frame:r[9],task:r[0x71f],camera:r[0x71a]*256+r[0x71c]});
  }
 }
 fs.writeFileSync(a.births!,JSON.stringify({source:'All native pipe-generated Piranha births in32 v2 RAM traces, including area initialization and parser task7/3 births.',births},null,2)+'\n');console.log(`${areas.length} areas, ${areas.reduce((n,a)=>n+a.plants.length,0)} plants; ${births.length} native births`);
}

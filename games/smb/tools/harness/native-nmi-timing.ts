/** Measures src/native-nmi-timing.ts against the cycle-counting CPU (native-cycle-cpu.mjs) on the real PRG.
 *   --rom PRG.nes --write-rom                         writes data/native-nmi-rom.json (the PRG tables and music data the model reads)
 *   --rom PRG.nes --monitor DIR --out F [--ids a,b]   for every gameplay row f (RAM row f-1 OperMode 1) of each power-on capture:
 *        NMI f replayed from RAM row f-1 and pad f against nativeNmiTiming (PPU-mask write, first Sprite0Clr and Sprite0Hit polls),
 *        and SoundEngine replayed alone against nativeSoundEngine (cycles and the sound RAM bytes $F0-$FF, $07B0-$07CA)
 *   --merge F1,F2,.. [--fixture]                     writes data/native-nmi-timing-validation.json; --fixture also writes
 *        tests/fixtures/native-nmi-timing.json (rows with a late hit poll and a spread of others, RAM gzip+base64)
 * Read-only measurement tooling; never used by the browser game. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
import {replayNmi,replaySoundEngine} from './native-cycle-cpu.mjs';
import {nativeCapture} from './native-captures.mjs';

const {values:a}=parseArgs({options:{rom:{type:'string'},'write-rom':{type:'boolean'},monitor:{type:'string'},out:{type:'string'},ids:{type:'string'},merge:{type:'string'},fixture:{type:'boolean'}}});
const here=path.dirname(new URL(import.meta.url).pathname),data=path.join(here,'../../data'),fixtures=path.join(here,'../../tests/fixtures');
const RANGES=[[0x805a,0x8081],[0x8ca4,0x8e03],[0xf3b0,0xf3be],[0xf4d3,0xf517],[0xf62b,0xf63a],[0xf90d,0xfff9]]; // VRAM address tables and ROM buffers; sound tables, headers, music data
const SOUND=[...Array(16)].map((_,i)=>0xf0+i).concat([...Array(0x1b)].map((_,i)=>0x7b0+i));

if(a['write-rom']){const file=fs.readFileSync(a.rom!),prg=file.subarray(16,16+file[4]*16384);
 const ranges=RANGES.map(([s,e])=>({address:s,hex:Buffer.from(prg.subarray(s&0x7fff,(e&0x7fff)+1)).toString('hex')}));
 fs.writeFileSync(path.join(data,'native-nmi-rom.json'),JSON.stringify({source:'PRG0 VRAM_AddrTable_Low/High $805A/$806D, VRAM_Buffer_Offset $8080, the ROM VRAM buffers $8CA4-$8E03; sound: SwimStompEnvelopeData $F3B0, the square-2 SFX frequency tables $F4D3-$F517, BrickShatter tables $F62B, MusicHeaderData through the length, frequency and envelope tables $F90D-$FFF9.',romSha256:createHash('sha256').update(file).digest('hex'),ranges},null,1)+'\n');
 console.log('wrote data/native-nmi-rom.json',ranges.reduce((n,r)=>n+r.hex.length/2,0),'bytes');}

if(a.out){
 const {nativeNmiTiming,nativeSoundEngine}=await import('../../src/native-nmi-timing.ts');
 const file=fs.readFileSync(a.rom!),prg=file.subarray(16,16+file[4]*16384);
 const inputs=JSON.parse(fs.readFileSync(path.join(a.monitor!,'combined-inputs.json'),'utf8')).runs.filter((r:any)=>r.start==='power-on'&&(!a.ids||a.ids.split(',').some(id=>r.id.includes(id))));
 const runs=[];
 for(const input of inputs){const dir=nativeCapture(input).dir,ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
  let rows=0,mismatches=0,first:any=null;const late:number[]=[];
  for(let f=1;f<ram.length/2048;f++){const row=ram.subarray((f-1)*2048,f*2048);if(row[0x770]!==1)continue;rows++;
   const {events}=replayNmi(prg,row,pads[f]);const w=events.filter(e=>e[0]==='w2001'),reads=events.filter(e=>e[0]==='r2002');
   const want={en:w[1]?.[1]??-1,clr:reads.find(e=>e[2]>=0x813d&&e[2]<0x8144)?.[1]??-1,hit:reads.find(e=>e[2]>=0x8150&&e[2]<0x8160)?.[1]??-1};
   let got:any;try{got=nativeNmiTiming(row,pads[f]);}catch(e){got={error:String(e)};}
   const s=replaySoundEngine(prg,row),mine=new Uint8Array(row);let cycles:number|string;try{cycles=nativeSoundEngine(mine);}catch(e){cycles=String(e);}
   const bytes=SOUND.filter(x=>mine[x]!==s.cpu.ram[x]);
   if(got.en!==want.en||got.clr!==want.clr||got.hit!==want.hit||cycles!==s.cycles||bytes.length){mismatches++;first??={frame:f,want,got,sound:{replay:s.cycles,model:cycles,bytes}};}
   if(want.hit>=5800)late.push(f);}
  runs.push({id:input.id,rows,mismatches,first,late});console.error(input.id.slice(5,13),rows,mismatches);}
 fs.writeFileSync(a.out,JSON.stringify({runs})+'\n');}

if(a.merge){
 const runs=a.merge.split(',').flatMap(f=>JSON.parse(fs.readFileSync(f,'utf8')).runs);
 const rows=runs.reduce((n:number,r:any)=>n+r.rows,0),mismatches=runs.reduce((n:number,r:any)=>n+r.mismatches,0);
 fs.writeFileSync(path.join(data,'native-nmi-timing-validation.json'),JSON.stringify({method:'tools/harness/native-nmi-timing.ts: every gameplay row of every power-on capture; NMI f from RAM row f-1 and pad f on native-cycle-cpu.mjs against nativeNmiTiming, SoundEngine alone against nativeSoundEngine (cycles and sound RAM).',recordings:runs.length,rows,mismatches,failing:runs.filter((r:any)=>r.mismatches).map((r:any)=>({id:r.id,mismatches:r.mismatches,first:r.first}))},null,1)+'\n');
 console.log('recordings',runs.length,'rows',rows,'mismatches',mismatches);
 if(a.fixture){const file=fs.readFileSync(a.rom!),prg=file.subarray(16,16+file[4]*16384);const cases=[];let k=0;
  const inputs=JSON.parse(fs.readFileSync(path.join(a.monitor!,'combined-inputs.json'),'utf8')).runs;
  for(const r of runs){const input=inputs.find((i:any)=>i.id===r.id),dir=nativeCapture(input).dir,ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
   const frames=new Set<number>(r.late);for(let f=1+(k++%97)*31;f<ram.length/2048;f+=3001)if(ram[(f-1)*2048+0x770]===1)frames.add(f);
   for(const f of [...frames].sort((x,y)=>x-y)){const row=ram.subarray((f-1)*2048,f*2048);const {events}=replayNmi(prg,row,pads[f]);const w=events.filter(e=>e[0]==='w2001'),reads=events.filter(e=>e[0]==='r2002');
    const s=replaySoundEngine(prg,row);
    cases.push({id:r.id.slice(0,13),frame:f,pad:pads[f],ram:zlib.gzipSync(row).toString('base64'),en:w[1]?.[1]??-1,clr:reads.find(e=>e[2]>=0x813d&&e[2]<0x8144)?.[1]??-1,hit:reads.find(e=>e[2]>=0x8150&&e[2]<0x8160)?.[1]??-1,sound:s.cycles,soundRam:Buffer.from(SOUND.map(x=>s.cpu.ram[x])).toString('hex')});}}
  fs.writeFileSync(path.join(fixtures,'native-nmi-timing.json'),JSON.stringify({source:'native-cycle-cpu.mjs replays of NMI f from RAM row f-1 and pad f (power-on captures): every row with hit >= 5800 and a spread of others.',soundAddresses:SOUND,cases})+'\n');
  console.log('fixture cases',cases.length);}}

/** Authentic entrance/walk/pipe/room/control sequences; source-native input and RAM are never corrected. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},levels:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.entrances||!a.levels||!a.out)throw Error('--traces --entrances --levels --out required');
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),pack=(b:Uint8Array)=>zlib.gzipSync(b).toString('base64');
const cases=a.levels.split(',').map(level=>{
 const dir=path.join(a.traces!,level),initial=fs.readFileSync(path.join(dir,'initial.ram')),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));if(ram.length!==pads.length*2048)throw Error(`${level}: unpaired input/RAM`);
 let firstControl=-1;for(let f=0;f<pads.length;f++)if(ram[f*2048+0x770]===1&&ram[f*2048+0x772]===3&&ram[f*2048+14]===8){firstControl=f;break;}if(firstControl<0)throw Error(`${level}: no retained PlayerRdy/control row`);
 const end=Math.min(firstControl+81,pads.length),input=pads.subarray(0,end),memory=ram.subarray(0,end*2048);
 return {level,receipt:JSON.parse(fs.readFileSync(path.join(a.entrances!,level,'entrance.json'),'utf8')),firstControl,frames:end,sourcePadSha256:hash(pads),sourceRamSha256:hash(ram),initialSha256:hash(initial),padsSha256:hash(input),ramSha256:hash(memory),initial:pack(initial),pads:pack(input),ram:pack(memory)};
});fs.writeFileSync(a.out,JSON.stringify({source:'Entire original native entrance prefix through eighty subsequent PlayerRdy/control frames. One authenticated initial RAM seed; unchanged input and RAM rows.',cases})+'\n');console.log(cases.map(c=>({level:c.level,frames:c.frames,firstControl:c.firstControl})));

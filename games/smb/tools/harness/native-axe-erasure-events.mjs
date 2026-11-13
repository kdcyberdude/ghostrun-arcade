/** Retain unmodified native replay inputs/RAM for paired-foot axe erasure.
 * node tools/harness/native-axe-erasure-events.mjs NAME TRACES RECEIPTS OUTPUT
 * Repeating a name replaces that run; other retained runs are preserved. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const [name,traces,receipts,output]=process.argv.slice(2);
if(!output)throw Error('NAME TRACES RECEIPTS OUTPUT required');
const read=file=>fs.readFileSync(path.join(traces,'1-4',file));
const initial=read('initial.ram'),pads=read('pads.bin'),ram=read('ram.bin');
const hash=b=>createHash('sha256').update(b).digest('hex');
let touch=-1;for(let f=0;f<pads.length;f++)if(ram[f*2048+0x770]===2){touch=f;break;}
if(touch<1)throw Error('Native victory entry not found');
const before=ram.subarray((touch-1)*2048,touch*2048),after=ram.subarray(touch*2048,(touch+1)*2048);
const axes=[];for(let a=0x500;a<0x700;a++)if(before[a]===0xc5)axes.push(a);
if(axes.length!==1)throw Error('Expected one live native axe metatile');
const pointer=after[6]+after[7]*256+after[2],axe=axes[0];
const fixture=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):{source:'Unmodified native RAM and controller replays; DoFootCheck/HandleAxeMetatile erase the right-foot pointer even when the left foot supplies C5.',runs:[]};
const run={name,level:'1-4',hashes:{initial:hash(initial),pads:hash(pads),ram:hash(ram)},initial:initial.toString('base64'),pads:pads.toString('base64'),ram:gzipSync(ram).toString('base64'),receipt:JSON.parse(fs.readFileSync(path.join(receipts,'1-4/entrance.json'),'utf8')),touch:{frame:touch,axe,pointer,remaining:after[axe]}};
fixture.runs=fixture.runs.filter(r=>r.name!==name);fixture.runs.push(run);
fs.writeFileSync(output,JSON.stringify(fixture)+'\n');
console.log(name,run.touch,run.hashes);

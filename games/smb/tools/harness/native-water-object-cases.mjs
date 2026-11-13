/** Authenticate whole native branches and retain compact per-row water object RAM.
 * node tools/harness/native-water-object-cases.mjs --branches DIR --out FILE */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{branches:{type:'string'},out:{type:'string',default:'tests/fixtures/native-water-object-cases.json'}}});if(!a.branches)throw Error('--branches required');
const sha=b=>createHash('sha256').update(b).digest('hex'),cases=[];
for(const mode of ['right-strokes','reverse','down-strokes']){
 const base=path.join(a.branches,'6-2-'+mode),dir=path.join(base,'traces/6-2'),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),initial=fs.readFileSync(path.join(dir,'initial.ram')),source=JSON.parse(fs.readFileSync(path.join(dir,'branch.json'),'utf8')),entrance=JSON.parse(fs.readFileSync(path.join(base,'entrances/6-2/entrance.json'),'utf8'));
 if(sha(ram)!==source.ramSha256||sha(pads)!==source.padsSha256||sha(initial)!==source.initialRamSha256)throw Error('Native branch hash mismatch');
 const rows=[];
 for(let f=0;f<pads.length;f++){
  const r=ram.subarray(f*2048,(f+1)*2048);if(r[0x74e]!==0||r[0x770]!==1||r[0x772]!==3||![7,8,11].includes(r[14]))continue;
  rows.push([f,r[14],r[9],r[0x739],r[0x73a],r[0x73b],r[0x6d]*256+r[0x86],r[0xce],r[0x71a]*256+r[0x71c],Array.from(r.subarray(0x4ac,0x4b0)),Array.from({length:5},(_,s)=>[r[15+s],r[22+s],r[0x6e+s]*256+r[0x87+s],r[0xcf+s],r[0xb6+s],r[0xa0+s],r[0x58+s],r[0x401+s],r[0x434+s],r[0x417+s],r[0x796+s],r[0x46+s],r[0x491+s]])]);
 }
 cases.push({mode,source,entrance,initial:zlib.gzipSync(initial).toString('base64'),pads:pads.toString('base64'),rows:zlib.gzipSync(Buffer.from(JSON.stringify(rows))).toString('base64')});
}
fs.writeFileSync(a.out,JSON.stringify({schema:'native-water-object-cases-v1',method:'Whole archived-entrance branch RAM/pad/initial hashes verified. Every water GameEngine7/8/11 row retained; one initial state, subsequent controller-only replay, no corrections.',cases},null,1)+'\n');

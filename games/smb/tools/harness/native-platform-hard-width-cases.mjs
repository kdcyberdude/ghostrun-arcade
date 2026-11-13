/** Native SPBBox/DrawLargePlatform width evidence from authenticated optional-water recordings. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{branches:{type:'string'},out:{type:'string',default:'tests/fixtures/native-platform-hard-width-cases.json'}}});if(!a.branches)throw Error('--branches required');
const hash=b=>createHash('sha256').update(b).digest('hex');
const cases=[['5-2',1713],['6-2',2658]].map(([level,row])=>{
 const dir=path.join(a.branches,`${level}-right-strokes`,'traces',level),ram=fs.readFileSync(path.join(dir,'ram.bin')),receipt=JSON.parse(fs.readFileSync(path.join(dir,'branch.json'),'utf8'));
 if(hash(ram)!==receipt.ramSha256)throw Error(`Branch receipt mismatch ${level}`);
 const r=ram.subarray(row*2048,(row+1)*2048),slot=2,box=0x4ac+(slot+1)*4;
 if(r[0x74e]!==0||!r[15+slot]||r[22+slot]!==39||r[box+2]<r[box])throw Error('Expected visible native large lift');
 return {level,area:'optional-water',row,slot,spec:[460,192],width:r[box+2]-r[box],source:receipt,initialSha256:hash(r),initial:zlib.gzipSync(r).toString('base64')};
});fs.writeFileSync(a.out,JSON.stringify(cases)+'\n');

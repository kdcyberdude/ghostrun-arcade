/** Portable before-BG player-box/contact evidence. node ... --moods CACHE */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{moods:{type:'string'},out:{type:'string',default:'tests/fixtures/native-water-contact-cases.json'}}});if(!a.moods)throw Error('--moods required');
const pack=b=>zlib.gzipSync(b).toString('base64'),hash=b=>createHash('sha256').update(b).digest('hex');
const requests=[['6ef303ebf601bc77293af05c68738b6eebd85f3793c76d0f0cbb6d70e068bc27',19280],['85112c159ab663327c948910c272dc5b883028516f9056c549ed548d47c1f9a1',15670],['ac686b2789744ab0087cd5c09efcfaa613d1844cc30f2dcb83bfadc14a806f01',21110]];
const cases=requests.map(([sha,row])=>{
 const dir=path.join(a.moods,'captures',sha),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),initial=ram.subarray(row*2048,(row+1)*2048),window=ram.subarray((row+1)*2048,(row+101)*2048);
 const receipt=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8'));if(hash(pads)!==receipt.padSha256||hash(ram)!==receipt.ramSha256)throw Error(`Native capture receipt mismatch ${sha}`);
 return {sha,row,source:'Authenticated full POWER-ON mood capture; unchanged native RAM rows, one-time initialization.',initialSha256:hash(initial),windowSha256:hash(window),initial:pack(initial),ram:pack(window),pads:pack(pads.subarray(row+1,row+101))};
});fs.writeFileSync(a.out,JSON.stringify(cases)+'\n');

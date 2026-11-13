/** Publish portable, genuine POWERON inputs/RAM for live partial-parser tests.
 * --captures DIR --out JSON [--frames N]; three authenticated independent pad streams. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{captures:{type:'string'},out:{type:'string'},frames:{type:'string',default:'946'}}});if(!a.captures||!a.out)throw Error('--captures and --out required');const frames=Number(a.frames),sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex'),cases=[];
for(const id of ['91a8d597ac470f707894096e1cca45fa2e90ae0a0aeef0b5d11a0b9f94bab577','a60f59c3a84153b6e724c67bf55fc4b94dfb22b785f73247cd1eee812159d966','2bfc31326b5ab09964d788f22f4d53e803e00a0aa3b43824b5ec0f31b08f58b8']){
 const d=path.join(a.captures,id),pads=fs.readFileSync(path.join(d,'pads.bin')),ram=fs.readFileSync(path.join(d,'ram.bin')),initial=fs.readFileSync(path.join(d,'initial.ram')),receipt=JSON.parse(fs.readFileSync(path.join(d,'capture.json'),'utf8'));
 if(sha(pads)!==id||sha(ram)!==receipt.ramSha256||initial.length!==2048||!initial.every(v=>v===255)||frames>pads.length)throw Error(`Native authentication failed ${id}`);
 cases.push({id,frames,romSha256:receipt.romSha256,ramSha256:receipt.ramSha256,initialSha256:sha(initial),receiptSha256:sha(fs.readFileSync(path.join(d,'capture.json'))),pads:pads.subarray(0,frames).toString('base64'),ram:gzipSync(ram.subarray(0,frames*2048),{level:9}).toString('base64')});
}
fs.writeFileSync(a.out,JSON.stringify({schema:'native-gameplay-continuation-v1',method:'Actual POWERON inputs and per-sample RAM; no entrance or later state correction. Byte digests checked before retaining prefix.',cases})+'\n');

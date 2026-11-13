/** Isolated real-ROM procedure proof + the six retained natural World1-1 block-bump events.
 * npx tsx tools/harness/native-block-enemy-events.mjs --rom ROM --proof BINARY --entries entries.jsonl --out FILE
 * Procedure cases deliberately control RAM/registers; natural events are unmodified captured frames. */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{rom:{type:'string'},proof:{type:'string'},entries:{type:'string'},out:{type:'string'}}});if(!a.rom||!a.proof||!a.entries||!a.out)throw Error('--rom --proof --entries --out required');
const hash=b=>createHash('sha256').update(b).digest('hex'),rom=fs.readFileSync(a.rom);assert.equal(hash(rom),'f61548fdf1670cffefcc4f0b7bdcdd9eaba0c226e3b74f8666071496988248de');
const pairs=[[0,65535],[65535,0],[256,255],[255,256],[32768,0],[0,32768],[0,0],[32767,0]],inputs=[];
const add=(state,y,k,pair)=>{const slot=k%5,[enemyX,marioX]=pair,r=Buffer.alloc(2048);r[8]=slot;r[6]=0;r[7]=5;r[2]=64;r[0x540]=0x23;r[0x74e]=1;r[0x16+slot]=6;r[0x1e+slot]=state;r[0xcf+slot]=y;r[0xb6+slot]=slot+1;r[0xa0+slot]=k&255;r[0x434+slot]=(k*61)&255;r[0x417+slot]=(k*197)&255;r[0x58+slot]=(k*17)&255;r[0x46+slot]=(k&1)+1;r[0x6e+slot]=enemyX>>8;r[0x87+slot]=enemyX&255;r[0x6d]=marioX>>8;r[0x86]=marioX&255;inputs.push({slot,enemyX,marioX,ram:r});};
for(let k=0;k<256;k++)add(k,k,k,pairs[k%pairs.length]);for(const state of [0,1,4,32,128,255])for(const y of [0,1,2,3,255])for(const pair of pairs)add(state,y,inputs.length,pair);
const state=(r,s)=>({state:r[0x1e+s],y:r[0xcf+s],speed:(r[0xa0+s]<<24)>>24,force:r[0x434+s],fraction:r[0x417+s],xSpeed:r[0x58+s],direction:r[0x46+s]});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'smb-block-proof-'));let controlled;
try{
 const input=path.join(temp,'input.bin'),output=path.join(temp,'output.bin');fs.writeFileSync(input,Buffer.concat(inputs.map(n=>Buffer.concat([Buffer.from([n.slot]),n.ram]))));const result=spawnSync(a.proof,[a.rom,input,output],{encoding:'utf8'});if(result.error)throw result.error;assert.equal(result.status,0,result.stderr);const bytes=fs.readFileSync(output);assert.equal(bytes.length,inputs.length*2048);
 controlled=inputs.map((n,i)=>{const after=bytes.subarray(i*2048,(i+1)*2048);assert.equal(after[0x540],0);return {slot:n.slot,enemyX:n.enemyX,marioX:n.marioX,before:state(n.ram,n.slot),after:state(after,n.slot),pageBefore:n.ram[0xb6+n.slot],pageAfter:after[0xb6+n.slot],floatey:[after[0x110+n.slot],after[0x12c+n.slot]]};});
}finally{fs.rmSync(temp,{recursive:true,force:true});}
const natural=[];
for(const line of fs.readFileSync(a.entries,'utf8').trim().split('\n')){
 const run=JSON.parse(line),selected=run.entries.filter(e=>e.diagnostic?.first?.cluster?.key==='main:enemy-motion-state:goomba:position+enemy');if(!selected.length)continue;
 const ram=fs.readFileSync(path.join(run.sourceDirectory,'ram.bin'));assert.equal(hash(ram),run.capture.ramSha256);
 for(const e of selected){const frame=e.diagnostic.first.sourceFrame,slot=e.diagnostic.first.sample.native.slot,before=ram.subarray((frame-1)*2048,frame*2048),after=ram.subarray(frame*2048,(frame+1)*2048);assert.equal(before[0x16+slot],6);assert.equal(after[0x1e+slot],34);natural.push({sha256:run.sha256,entry:e.index,frame,slot,ramSha256:run.capture.ramSha256,beforeSha256:hash(before),afterSha256:hash(after),before:state(before,slot),after:state(after,slot),enemyX:before[0x6e+slot]*256+before[0x87+slot],marioX:after[0x6d]*256+after[0x86],xAfter:after[0x6e+slot]*256+after[0x87+slot],xFraction:before[0x401+slot],xFractionAfter:after[0x401+slot],floatey:[after[0x110+slot],after[0x12c+slot]]});}
}
assert.equal(natural.length,6);fs.writeFileSync(a.out,JSON.stringify({source:'Unmodified PRG0 HandleEToBGCollision with controlled RAM/registers, plus six unmodified natural World1-1 frames. Isolated procedure tests are not full-run proof.',romSha256:hash(rom),proofBinarySha256:hash(fs.readFileSync(a.proof)),proofSourceSha256:hash(fs.readFileSync(new URL('./native-block-enemy-proof.cpp',import.meta.url))),controlled,natural})+'\n');console.log(controlled.length,'real-ROM procedure cases;',natural.length,'natural World1-1 events');

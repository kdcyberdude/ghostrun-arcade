/** Copy an authenticated native RAM window without altering any byte.
 * node tools/harness/native-pole-scroll-witness.mjs --capture DIR --offset N --from N --to N --out fixture.json */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{capture:{type:'string'},offset:{type:'string'},from:{type:'string'},to:{type:'string'},out:{type:'string'}}});
if(!a.capture||!a.out||a.offset===undefined||a.from===undefined||a.to===undefined)throw Error('--capture, --offset, --from, --to and --out required');
const offset=Number(a.offset),from=Number(a.from),to=Number(a.to),ram=fs.readFileSync(path.join(a.capture,'ram.bin')),pads=fs.readFileSync(path.join(a.capture,'pads.bin'));
if(![offset,from,to].every(Number.isInteger)||offset+from<1||to<from||(offset+to+1)*2048>ram.length)throw Error('Invalid RAM window');
const sha=b=>createHash('sha256').update(b).digest('hex'),window=ram.subarray((offset+from-1)*2048,(offset+to+1)*2048);
fs.writeFileSync(a.out,JSON.stringify({schema:'native-pole-scroll-witness-v1',role:'Read-only POWER-ON native RAM witness; runtime episode remains entrance-seeded diagnostic.',sourcePadsSha256:sha(pads),sourceRamSha256:sha(ram),sourceFrameOffset:offset,from,to,includesPreviousRow:true,windowSha256:sha(window),ram:gzipSync(window,{level:9}).toString('base64')})+'\n');
console.log(JSON.stringify({from,to,windowSha256:sha(window)}));

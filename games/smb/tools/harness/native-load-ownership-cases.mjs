/** Preserve cold retained entrances and source InitializeArea ownership windows.
 * node tools/harness/native-load-ownership-cases.mjs --root recovered-native/original32 --out FILE */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{root:{type:'string'},out:{type:'string',default:'tests/fixtures/native-load-ownership-cases.json'}}});if(!a.root)throw Error('--root required');const hash=b=>createHash('sha256').update(b).digest('hex'),pack=b=>zlib.gzipSync(b).toString('base64'),cases=[];
for(const[level,from,to]of [['1-2',1781,1805],['4-2',2726,2750],['3-4',4607,4771]]){
 const dir=path.join(a.root,'traces',level),initial=fs.readFileSync(path.join(dir,'initial.ram')),allPads=fs.readFileSync(path.join(dir,'pads.bin')),allRAM=fs.readFileSync(path.join(dir,'ram.bin')),pads=allPads.subarray(0,to+1),ram=allRAM.subarray(from*2048,(to+1)*2048),entrance=JSON.parse(fs.readFileSync(path.join(a.root,'entrances',level,'entrance.json'),'utf8'));
 if(hash(initial)!==entrance.initialRamSha256)throw Error('Initial native RAM receipt mismatch');
 cases.push({level,from,to,source:{initialSha256:hash(initial),fullPadsSha256:hash(allPads),fullRamSha256:hash(allRAM),padsSha256:hash(pads),ramSha256:hash(ram)},entrance,initial:pack(initial),pads:pack(pads),ram:pack(ram)});
}
fs.writeFileSync(a.out,JSON.stringify({schema:'native-load-ownership-cases-v1',method:'One legitimate retained entrance, exact original controller prefix, no intermediate state corrections. Ownership checked on every InitializeArea/screen-parser row in the declared windows.',cases},null,1)+'\n');

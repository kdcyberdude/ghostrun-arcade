/** Preserve one authentic water coin buffer/PPU sample for the RowOfCoins projection test.
 * node tools/harness/native-water-coin-case.mjs --capture DIR --frame N --out FILE */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{capture:{type:'string'},frame:{type:'string'},out:{type:'string'}}});if(!a.capture||!a.frame||!a.out)throw Error('--capture, --frame, --out required');
const sha=b=>createHash('sha256').update(b).digest('hex'),ram=fs.readFileSync(path.join(a.capture,'ram.bin')),pads=fs.readFileSync(path.join(a.capture,'pads.bin')),meta=JSON.parse(fs.readFileSync(path.join(a.capture,'pixels/pixels.json'),'utf8')),frame=Number(a.frame),prior=ram.subarray((frame-1)*2048,frame*2048),sample=ram.subarray(frame*2048,(frame+1)*2048);
if(sha(ram)!==meta.ramSha256||sha(pads)!==meta.padSha256)throw Error('Native RAM/controller receipt mismatch');
if(meta.step!==1||meta.width!==240||meta.height!==224)throw Error('Expected every-frame native PPU export');
const pixelHash=createHash('sha256');for await(const chunk of fs.createReadStream(path.join(a.capture,'pixels/pixels.bin')))pixelHash.update(chunk);if(pixelHash.digest('hex')!==meta.pixelsSha256)throw Error('Native PPU receipt mismatch');
const pixels=Buffer.alloc(240*224),handle=fs.openSync(path.join(a.capture,'pixels/pixels.bin'),'r');if(fs.readSync(handle,pixels,0,pixels.length,frame*pixels.length)!==pixels.length)throw Error('Incomplete native frame');fs.closeSync(handle);
const camera=prior[0x71a]*256+prior[0x71c],crop={x:1792,y:80,width:96,height:48},indices=Buffer.alloc(crop.width*crop.height);
for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++)indices[y*crop.width+x]=pixels[(crop.y+y-8)*240+crop.x+x-camera-8];
fs.writeFileSync(a.out,JSON.stringify({schema:'native-water-coin-case-v1',source:{capture:path.basename(a.capture),frame,padsSha256:sha(pads),ramSha256:sha(ram),pixels:meta,pixelFrameSha256:sha(pixels),method:'Unmodified POWER-ON capture; PPU frame uses prior RAM scroll. Crop is lossless NES palette indices.'},ram:zlib.gzipSync(sample).toString('base64'),ramSha256:sha(sample),picture:{camera,crop,indices:zlib.gzipSync(indices).toString('base64')}},null,1)+'\n');

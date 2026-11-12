/** Native jumping-Paratroopa motion rows and the block-buffer cells read by
 * EnemyJump/DoEnemySideCheck. Includes every eligible id14 row of all traces;
 * excludes new enemy-pair contacts, whose direction change is a later pass.
 * node tools/harness/native-paratroopa-events.mjs --traces DIR
 * [--out tests/fixtures/native-paratroopa-events.json] */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-paratroopa-events.json'}}});
if(!a.traces)throw Error('--traces is required');
const signed=v=>v<128?v:v-256;
function state(r,s){return {x:r[0x6e+s]*256+r[0x87+s]+r[0x401+s]/256,y:r[0xb6+s]*256+r[0xcf+s]-256+24,vx:signed(r[0x58+s])/16,speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s]};}
const events=[];
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const data=fs.readFileSync(file);
 for(let f=1;f<data.length/2048;f++){
  const p=data.subarray((f-1)*2048,f*2048),r=data.subarray(f*2048,(f+1)*2048);
  if(p[0xe]!==8||r[0xe]!==8||((r[9]-p[9])&255)!==1)continue;
  for(let s=0;s<5;s++){
   if(p[0xf+s]!==1||r[0xf+s]!==1||p[0x16+s]!==14||r[0x16+s]!==14||p[0x1e+s]!==0||r[0x1e+s]!==0)continue;
   if([0,1,2,3,4].some(i=>i<s?((p[0x491+i]^r[0x491+i])&(0x80>>s)):i>s?((p[0x491+s]^r[0x491+s])&(0x80>>i)):false))continue;
   const before=state(p,s),after=state(r,s),cells=[];
   const cell=(x,y)=>{const col=Math.floor(x/16),row=Math.floor(y/16)-2,addr=0x500+((col>>4)&1)*0xd0+row*16+(col&15),valid=row>=0&&row<13;return {x,y,value:valid?r[addr]:0,stable:!valid||p[addr]===r[addr]};};
   cells.push(cell(Math.floor(before.x)+8,before.y));
   const snapped=((Math.floor(before.y)-24)&~15|8)+24;
   cells.push(cell(Math.floor(before.x)+(before.vx>0?16:0),before.y-4),cell(Math.floor(before.x)+(before.vx>0?16:0),snapped-4));
   if(cells.some(c=>!c.stable))continue;
   events.push({level,row:f,slot:s,before,after,cells:cells.map(({x,y,value})=>({x,y,value}))});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify({schema:'native-paratroopa-motion-v1',count:events.length,rows:zlib.gzipSync(JSON.stringify(events),{level:9}).toString('base64')})+'\n');console.log(`${events.length} native green Paratroopa rows`);

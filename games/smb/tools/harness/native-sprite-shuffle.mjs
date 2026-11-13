/** Read independently observed NMI OAM-offset transitions. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-sprite-shuffle.json'}}});if(!a.traces)throw Error('--traces required');
const state=r=>({offsets:[...r.subarray(0x6e4,0x6f3)],amounts:[...r.subarray(0x6e1,0x6e4)],index:r[0x6e0]});
const out={source:'Native NMI SpriteShuffler with Sprite0HitDetectFlag0722 set before/after and stable game task; GamePauseStatus0776 bit0 gates the shuffle.',checked:0,rows:[]},seen=new Set();
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const data=fs.readFileSync(file);
 for(let f=1;f<data.length/2048;f++){
  const r=data.subarray(f*2048,(f+1)*2048),p=data.subarray((f-1)*2048,f*2048);if(!p[0x722]||!r[0x722]||p[0x770]!==r[0x770]||p[0x772]!==r[0x772]||r[0x770]===1&&r[0x772]!==3)continue;
  const before=state(p),after=state(r),paused=Boolean(r[0x776]&1),advance=((r[9]-p[9])&255)===1,key=JSON.stringify([before,paused,advance,after]);out.checked++;if(seen.has(key))continue;seen.add(key);out.rows.push({level,frame:f,before,paused,advance,after,misc:[...r.subarray(0x6f3,0x6fc)]});
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(out.checked,'native shuffle rows;',out.rows.length,'distinct cases');

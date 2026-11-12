/** Extract Goomba sprite rows from native OAM and the RAM inputs used by GmbaAnim.
 * node tools/harness/native-goomba-animation.mjs --traces DIR [--out tests/fixtures/native-goomba-animation.json]
 * Every full visible row is checked. Retain each change and every eighth row for compact renderer regressions.
 * EnemyGfxHandler runs before movement/collision: a turn made this frame is already in RAM, but the sprites keep the previous direction.
 * Source: https://github.com/Xkeeper0/smb1/blob/master/src/prg.asm (EnemyGfxHandler, GmbaAnim).
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-goomba-animation.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={source:'Native v2 RAM: FrameCounter $09, Enemy_MovingDir $46+s before this frame, and OAM $0200 via Enemy_SprDataOffset $06E5+s; tuples [frame,counter,direction,leftTile,leftAttributes,rightTile,rightAttributes,priorX,priorFeetY,camera,oamX,oamY]',checked:0,levels:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file),rows=[];let prior='';
 for(let f=1;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),p=d.subarray((f-1)*2048,f*2048);
  if(r[14]!==8||r[0x747]!==0||r[0x770]!==1)continue;
  for(let s=0;s<5;s++){
   if(!r[0xf+s]||r[0x16+s]!==6||r[0x1e+s]!==0)continue;
   const x=r[0x6e+s]*256+r[0x87+s]-r[0x71a]*256-r[0x71c],y=r[0xcf+s];if(x<0||x>230)continue;
   const o=0x200+r[0x6e5+s]+8; // Enemy_SprDataOffset: second row, left and right sprite
   if(r[o]!==y+8||r[o+4]!==y+8||Math.abs(r[o+3]-x)>1||r[o+7]-r[o+3]!==8)continue;
   const tiles=[[r[o+3],r[o+1],r[o+2]],[r[o+7],r[o+5],r[o+6]]];
   const direction=p[0xf+s]&&p[0x16+s]===6?p[0x46+s]:r[0x46+s];
   if(!p[0xf+s]||p[0x16+s]!==6)continue;
   const camera=r[0x71a]*256+r[0x71c];
   const row=[f,r[9],direction,tiles[0][1],tiles[0][2],tiles[1][1],tiles[1][2],p[0x6e+s]*256+p[0x87+s],p[0xcf+s]+24,camera,r[o+3],r[o]],key=JSON.stringify(row.slice(2,7));
   out.checked++;if(key!==prior||f%8===0)rows.push(row);prior=key;
  }
 }
 if(rows.length)out.levels.push({level,rows});
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`${out.checked} native OAM rows; ${out.levels.reduce((n,l)=>n+l.rows.length,0)} retained`);

/** Native PlayerGfxHandler foot-tile replacement after drawing PlayerGfxOffset's cell.
 * node tools/harness/native-swim-kick.mjs --traces DIR [--out tests/fixtures/native-swim-kick.json]
 * Capture every normal swimming OAM row; the target is left foot when facing right, right foot when facing left.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-swim-kick.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={source:'Native v2 RAM: SwimmingFlag$0704, Player_State$1D, PlayerGfxOffset$06D5, FrameCounter$09 and seventh/eighth OAM tile via Player_SprDataOffset$06E4; tuples [frame,cell,counter,footTile]',checked:0,levels:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file),rows=[];let previous='';
 for(let f=0;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),cell=r[0x6d5]>>3;
  if(r[0x770]!==1||![7,8].includes(r[14])||r[0x79e]||!r[0x704]||r[0x1d]===0||![5,6,7,17,18,19].includes(cell))continue;
  const o=0x200+r[0x6e4]+24+(r[0x33]===2?4:0),row=[f,cell,r[9],r[o+1]],key=JSON.stringify([cell,r[o+1]]);out.checked++;
  if(key!==previous||f%8===0)rows.push(row);previous=key;
 }
 if(rows.length)out.levels.push({level,rows});
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`${out.checked} native swimming-foot rows`);

/** Native FloateyNum timer/motion/erase evidence, independent of the remake's fitted display lifetimes.
 * node tools/harness/native-popup-lifecycle.mjs --traces DIR [--out tests/fixtures/native-popup-lifecycle.json]
 * RAM: control$0110+s, timer$012C+s, screenX$0117+s, rawY$011E+s. Score glyphs are located directly in current OAM.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-popup-lifecycle.json'}}});
if(!a.traces)throw Error('--traces is required');
const tiles=JSON.parse(fs.readFileSync('assets/graphics/tables.json','utf8')).tables.find(t=>t.symbol==='FloateyNumTileData').bytes;
function picture(r,s){
 const control=r[0x110+s],x=r[0x117+s];if(!control||control>11)return;
 for(let k=0;k<63;k++){
  const o=0x200+k*4;
  if(r[o+1]===tiles[control*2]&&r[o+5]===tiles[control*2+1]&&r[o+3]===x&&r[o+7]===((x+8)&255)&&r[o]===r[o+4]&&r[o]<240)return {x,y:r[o]+1};
 }
}
const out={source:'Native v2 RAM/OAM: SetupFloateyNumber starts$30, FloateyNumbersRoutine decrements independently, EraseEnemyObject clears control with timer residue',births:[],ticks:[],erases:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const d=fs.readFileSync(file);
 for(let f=1;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),p=d.subarray((f-1)*2048,f*2048);
  if(r[0x770]!==1||p[0x770]!==1||r[0x772]!==3||p[0x772]!==3||![7,8].includes(r[14])||![7,8].includes(p[14])||r[9]!==((p[9]+1)&255))continue; // paused/lag rows do not run a new complete engine pass
  for(let s=0;s<6;s++){
   const before=p[0x110+s],after=r[0x110+s],timer=p[0x12c+s],next=r[0x12c+s];
   if(after&&next===47&&(before===0||timer<next))out.births.push({level,frame:f,slot:s,timer:next});
   if(before&&!after&&next>0&&p[15+s]&&!r[15+s])out.erases.push({level,frame:f,slot:s,timer:next});
   if(!before||next!==Math.max(0,timer-1)||!(after===before||!after&&timer===0))continue;
   const oldPicture=picture(p,s),nextPicture=picture(r,s);if(!oldPicture||after&&!nextPicture)continue;
   out.ticks.push({level,frame:f,slot:s,timer,next,visible:Boolean(after),y:oldPicture.y,nextY:nextPicture?.y??null});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(`popup births${out.births.length}, ticks${out.ticks.length}, erases${out.erases.length}`);

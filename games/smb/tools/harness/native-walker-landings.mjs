/** Native state1->0 walker landings, excluding a new enemy-pair turn that
 * runs after background contact. Inputs are pre-move slot bytes and Mario's
 * current position; outputs are final byte state after horizontal movement.
 * node tools/harness/native-walker-landings.mjs --traces DIR
 * [--out tests/fixtures/native-walker-landings.json] */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-walker-landings.json'}}});
if(!a.traces)throw Error('--traces is required');
const signed=v=>v<128?v:v-256,state=(r,s)=>({x:r[0x6e+s]*256+r[0x87+s]+r[0x401+s]/256,y:r[0xb6+s]*256+r[0xcf+s]-256+24,vx:signed(r[0x58+s])/16,speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s]});
const events=[];
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const data=fs.readFileSync(file);
 for(let f=1;f<data.length/2048;f++){
  const p=data.subarray((f-1)*2048,f*2048),r=data.subarray(f*2048,(f+1)*2048);
  if(p[0xe]!==8||r[0xe]!==8)continue;
  for(let s=0;s<5;s++){
   const id=r[0x16+s];
   if(p[0xf+s]!==1||r[0xf+s]!==1||p[0x16+s]!==id||![0,1,2,3,4,6].includes(id)||p[0x1e+s]!==1||r[0x1e+s]!==0)continue;
   if([0,1,2,3,4].some(i=>i<s?((p[0x491+i]^r[0x491+i])&(0x80>>s)):i>s?((p[0x491+s]^r[0x491+s])&(0x80>>i)):false))continue;
   events.push({level,row:f,slot:s,goomba:id===6,marioX:r[0x6d]*256+r[0x86],before:state(p,s),after:state(r,s)});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(events).replace(/\{"level"/g,'\n{"level"')+'\n');console.log(`${events.length} native walker landings`);

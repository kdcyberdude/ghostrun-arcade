/** Extract native walker contact and unwinging evidence from every supplied RAM trace.
 * node tools/harness/native-walker-events.mjs --traces DIR --out FILE
 * Slot state comes from $0F/$16/$1E, positions $6E/$87/$401/$CF,
 * velocity $58/$A0/$434/$417, direction $46, contacts $491, frame $09.
 * This is measurement tooling; the runtime never reads recorded events. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});
if(!a.traces||!a.out)throw Error('--traces and --out are required');
const signed=v=>v<128?v:v-256;
const state=(r,s)=>({x:r[0x6e+s]*256+r[0x87+s]+r[0x401+s]/256,y:r[0xcf+s]+24,speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s],vx:signed(r[0x58+s])/16,direction:r[0x46+s]});
const out={unwinged:[],contacts:[],redFlights:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const data=fs.readFileSync(file),row=f=>data.subarray(f*2048,(f+1)*2048);
 for(let f=1;f<data.length/2048;f++){
  const p=row(f-1),r=row(f);
  if(p[0xe]!==8||r[0xe]!==8||r[0x770]!==1)continue;
  for(let s=0;s<5;s++)if(p[0xf+s]&&r[0xf+s]&&[14,15,16].includes(p[0x16+s])&&r[0x16+s]===(p[0x16+s]&1))
   out.unwinged.push({level,row:f,slot:s,before:state(p,s),after:state(r,s),mario:r[0x6d]*256+r[0x86]});
  for(let s=0;s<5;s++)if(p[0xf+s]===1&&r[0xf+s]===1&&p[0x16+s]===15&&r[0x16+s]===15){
   const flight=q=>({y:q[0xcf+s]+24,speed:signed(q[0xa0+s]),force:q[0x434+s],fraction:q[0x417+s]});
   out.redFlights.push({level,row:f,frame:r[9],before:{...flight(p),originalY:p[0x401+s],centerY:p[0x58+s]},after:flight(r)});
  }
  if(r[0x74e]===0||r[9]%2===0)continue;
  const bodies=[];
  for(let s=0;s<5;s++)if(p[0xf+s]===1&&r[0xf+s]===1&&p[0x16+s]===r[0x16+s]&&[0,1,2,3,4,6,14,18].includes(r[0x16+s])&&(p[0x1e+s]&0xa0)===0){
   const id=r[0x16+s];bodies.push({slot:s,x:p[0x6e+s]*256+p[0x87+s],y:p[0xcf+s],tall:id!==6&&id!==18,turns:p[0x1e+s]===0,reacts:true});
  }
  const before=Array.from({length:5},(_,s)=>p[0x491+s]&0xf8),after=Array.from({length:5},(_,s)=>r[0x491+s]&0xf8);
  const supported=before.every((b,i)=>[0,1,2,3,4].every(j=>!((b^after[i])&(0x80>>j))||bodies.some(v=>v.slot===i)&&bodies.some(v=>v.slot===j)));
  if(supported&&before.some((b,s)=>b!==after[s]))out.contacts.push({level,row:f,camera:r[0x71a]*256+r[0x71c],frame:r[9],bodies,before,after});
 }
}
fs.writeFileSync(a.out,JSON.stringify(out).replace(/\{"level"/g,'\n{"level"')+'\n');
console.log(`unwinged ${out.unwinged.length}, contacts ${out.contacts.length}, redFlights ${out.redFlights.length}`);

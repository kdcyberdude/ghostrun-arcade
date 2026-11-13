/** Extract native MoveBloober/MoveFlyingCheepCheep transitions, never runtime corrections.
 * node tools/harness/native-water-rule-events.mjs --traces DIR [--out FILE]
 * Each entry is [level,row,slot,before,input,after]. Object bytes: x $6E/$87, y $B6/$CF,
 * speed $A0, force $0434, fraction $0417, direction $46, counter $A0, interval $0796.
 * Input bytes: FrameCounter $09, random $07A8+slot, hard mode $06CC, Mario $6D/$86/$CE/$45.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-water-rule-events.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={waterContacts:[],swimming:[],blooper:[],flying:[],blooperSpawns:[],slotReuse:[],bubbles:[],bubbleEntrances:[]};
const signed=v=>v<128?v:v-256;
const blooper=(r,s)=>[r[0x6e+s]*256+r[0x87+s],r[0xcf+s],r[0xa0+s],r[0x434+s],r[0x796+s],r[0x46+s]];
const flight=(r,s)=>[r[0xb6+s]*256+r[0xcf+s]-256,signed(r[0xa0+s]),r[0x434+s],r[0x417+s]];
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const data=fs.readFileSync(file),last=[];
 for(let f=1;f<data.length/2048;f++){
  const p=data.subarray((f-1)*2048,f*2048),r=data.subarray(f*2048,(f+1)*2048);
  if(r[0x772]===0)last.length=0; // an area load clears the slot residue
  if(r[0x770]!==1||p[0x770]!==1)continue;
  if(r[0x74e]===0&&r[0x772]===3&&r[14]>=7&&r[14]<=11&&!(r[0x776]&1)){
   const bubble=(q,s)=>[q[0x83+s]*256+q[0x9c+s],q[0xe4+s],q[0xcb+s],q[0x42c+s]];
   const after=[r[0x792],[0,1,2].map(s=>bubble(r,s))];
   if(p[14]===0&&r[14]===7)out.bubbleEntrances.push([level,f,[r[0x6d]*256+r[0x86],r[0xce],r[0x33]],Array.from(r.subarray(0x7a7,0x7ae)),after]);
   if(p[0x74e]===0&&p[0x772]===3&&p[14]>=7&&p[14]<=11){
    let x=r[0x6d]*256+r[0x86],y=r[0xce];
    // The rectangle records Mario before Whirlpool, but its cached relative X
    // precedes ImpedePlayerMove's one-pixel back-out. A wall zeroes X speed.
    if(r[14]===8&&r[0x4ac]!==255){const big=r[0x754]===0,duck=Boolean(r[0x714]),camera=r[0x71a]*256+r[0x71c];if(r[0x57]!==0)x=r[0x4ac]+camera-(big?2:3);y=(r[0x4ad]-(big&&!duck?8:20))&255;}
    out.bubbles.push([level,f,[p[0x792],[0,1,2].map(s=>bubble(p,s))],[x,y,r[0x33]],Array.from(r.subarray(0x7a7,0x7ae)),p[0x747]<=1,after]);
   }
  }
  for(let s=0;s<5;s++){
   if(p[0xf+s]&&!r[0xf+s])last[s]=[r[0x401+s],r[0x417+s]];
   if(!r[0xf+s])continue;
   const id=r[0x16+s],stable=p[0xf+s]&&p[0x16+s]===id;
   if(!stable&&id===7)out.blooperSpawns.push([level,f,s,blooper(r,s)]);
   if(!stable&&id===20&&last[s])out.slotReuse.push([level,f,s,last[s],[r[0x401+s],r[0x417+s]]]);
   if(!stable||r[14]!==8||p[14]!==8||p[0x1e+s]&32||r[0x1e+s]&32)continue;
   if(id===7)out.blooper.push([level,f,s,blooper(p,s),[r[9],r[0x7a8+s],r[0x6cc]?3:63,r[0x6d]*256+r[0x86],r[0xce],r[0x45],p[0x77f],p[0xce],p[0xb5],r[0xb5]],blooper(r,s)]);
   if(r[0x74e]===0&&!(r[9]&1)&&[7,10,11].includes(id)&&!r[0x3d8+s]){
    const player=Array.from(r.subarray(0x4ac,0x4b0)),enemy=Array.from(r.subarray(0x4b0+s*4,0x4b4+s*4));
    if(!player.includes(255)&&!enemy.includes(255)){
     const big=r[0x754]===0,duck=Boolean(r[0x714]),camera=r[0x71a]*256+r[0x71c];
     const hit=player[0]<=enemy[2]&&enemy[0]<=player[2]&&player[1]<=enemy[3]&&enemy[1]<=player[3];
     out.waterContacts.push([level,f,s,player[0]+camera-(big?2:3),player[1]-(big&&!duck?8:20),big,duck,p[0x6e+s]*256+p[0x87+s],p[0xcf+s],hit]);
    }
   }
   if(id===10||id===11){const state=q=>[q[0x6e+s]*256+q[0x87+s]+q[0x401+s]/256,q[0xb6+s]*256+q[0xcf+s]-256,q[0x417+s],q[0x58+s],q[0x434+s]];out.swimming.push([level,f,s,id,state(p),state(r)]);}
   if(id===20)out.flying.push([level,f,s,flight(p,s),flight(r,s)]);
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');
console.log(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,v.length])));

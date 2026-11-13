/** Extract every native mode2 control transition. AutoControlPlayer movement is an explicit callback input, not claimed as covered here.
 * node tools/harness/native-victory-events.mjs --traces DIR --entrances DIR --output tests/fixtures/native-victory-events.json */
import {decodeEntrance} from './native-entrance.mjs';
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},output:{type:'string'},entrances:{type:'string'},'full-levels':{type:'string',default:'1-4,2-4,3-4'}}});if(!a.traces||!a.output||!a.entrances)throw Error('--traces, --entrances and --output required');
const signed=n=>(n<<24)>>24;
const digits=(r,a,n)=>Array.from(r.subarray(a,a+n)).reduce((v,d)=>v*10+d,0);
function state(r){const s=r[0x368];return {task:r[0x772],destination:r[0x34],walk:r[0x35],scrollFraction:r[0x768],primary:r[0x719],secondary:r[0x749],endTimer:r[0x7a1],feet:r[0x364],controls:r[0x363],bridge:r[0x369],bossState:r[0x1e+s],boss:{y:r[0xcf+s],speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s],timer:0}};}
const events=[],runtime=[];
for(const level of fs.readdirSync(a.traces).sort()){
 const b=fs.readFileSync(path.join(a.traces,level,'ram.bin')),pads=fs.readFileSync(path.join(a.traces,level,'pads.bin'));
 const start=Array.from({length:b.length/2048},(_,f)=>f).find(f=>b[f*2048+0x770]===2);
 if(start!==undefined){const rows=[];for(let f=start+1;f<b.length/2048;f++){const r=b.subarray(f*2048,(f+1)*2048);rows.push({frame:f,pad:pads[f],x:r[0x6d]*256+r[0x86],xf:r[0x400],speed:signed(r[0x57])*256+r[0x705],y:r[0xce],write:r[0x773]>=12&&r[0x773]<=18?(r[0x773]===13?0:r[0x773]-12):-1,cell:r[0x6d5]>>3,anim:[r[0x70d],r[0x781],r[0x70c]],camera:r[0x71a]*256+r[0x71c],bridge:r[0x369],task:r[0x772],mode:r[0x770],engine:r[14],screen:r[0x73c],disable:r[0x774],interval:r[0x77f],frameCounter:r[9],random:Array.from(r.subarray(0x7a7,0x7ae)),time:digits(r,0x7f8,3),score:digits(r,0x7dd,6)*10,coins:r[0x75e],boss:r[0x16+r[0x368]]===45&&r[15+r[0x368]]===1?[r[0x6e+r[0x368]]*256+r[0x87+r[0x368]],r[0xcf+r[0x368]]]:null});}runtime.push({level,frame:start,ram:b.subarray(start*2048,(start+1)*2048).toString('base64'),rows,...(a['full-levels']?.split(',').includes(level)?{full:{entrance:decodeEntrance(fs.readFileSync(path.join(a.traces,level,'initial.ram')),JSON.parse(fs.readFileSync(path.join(a.entrances,level,'entrance.json'),'utf8'))),pads:Array.from(pads.subarray(0,start+1))}}:{})});}
 for(let f=1;f<b.length/2048;f++){
  const r=b.subarray(f*2048,(f+1)*2048),p=b.subarray((f-1)*2048,f*2048);if(p[0x770]!==2||(r[0x770]!==2&&!(r[0x770]===1&&p[0x772]===4))||p[0x747]||r[0x747])continue;
  const s=p[0x368];events.push({level,frame:f,before:state(p),after:state(r),input:{world:p[0x75f]+1,camera:p[0x71a]*256+p[0x71c],playerX:p[0x6d]*256+p[0x86],bossPresent:p[0x16+s]===45,intervalTick:r[0x77f]===20},auto:{playerX:r[0x6d]*256+r[0x86],axe:p[0x772]===2&&r[0x772]===0},camera:r[0x71a]*256+r[0x71c],advance:r[0x770]===1});
 }
}
fs.writeFileSync(a.output,'{"method":"VictoryModeSubroutines source control only; AutoControlPlayer position is an input, not a tested output. See extraction tool.","events":[\n'+events.map(e=>JSON.stringify(e)).join(',\n')+'\n],"runtime":'+JSON.stringify(runtime)+'}\n');console.log(events.length+' transitions');

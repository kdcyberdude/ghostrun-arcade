/** Native task0/InitializeArea through PlayerRdy, retaining the unreset controller prefix. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {decodeEntrance} from './native-entrance.mjs';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},out:{type:'string'},capture:{type:'string'}}});if(!a.traces||!a.entrances||!a.out)throw Error('--traces, --entrances, --out required');
const runs=[];
function add(level,dir,receipt,offset=0){
 const ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),before=fs.readFileSync(path.join(dir,'initial.ram')),initial=offset?ram.subarray((offset-1)*2048,offset*2048):before;
 const row=f=>ram.subarray((f+offset)*2048,(f+offset+1)*2048);let start=-1,end=-1;
 for(let f=1;f<pads.length-offset;f++){const r=row(f),p=row(f-1);if(start<0&&r[0x772]===0&&p[0x772]===3&&[2,3,7].includes(r[14]))start=f;if(start>=0&&r[0x772]===3&&r[14]===8){end=f+1;break;}}
 if(end<0)throw Error(`no pipe lifecycle ${level}`);const rows=[];
 for(let frame=start;frame<=end;frame++){const r=row(frame);rows.push({frame,state:{task:r[0x772],engine:r[14],screen:r[0x73c],disable:r[0x774],timer:r[0x7a0],columns:r[0x71e]},fc:r[9],interval:r[0x77f],random:Array.from(r.subarray(0x7a7,0x7ae)),x:r[0x6d]*256+r[0x86],y:(r[0xb5]-1)*256+r[0xce],camera:r[0x71a]*256+r[0x71c],time:r[0x7f8]*100+r[0x7f9]*10+r[0x7fa],control:r[0x787],priority:[Boolean(r[0x3c4]&32),Boolean(r[0x202+r[0x6e4]]&32)]});}
 runs.push({level,entrance:decodeEntrance(initial,receipt),pads:Array.from(pads.subarray(offset,offset+end+1)),rows});
}
for(const level of ['1-2','2-2','4-2','7-2'])add(level,path.join(a.traces,level),JSON.parse(fs.readFileSync(path.join(a.entrances,level,'entrance.json'),'utf8')));
if(a.capture){const receipt=JSON.parse(fs.readFileSync(path.join(a.capture,'entries/0000/receipts/1-1/entrance.json'),'utf8'));add('1-1',a.capture,receipt,receipt.sourceFrameOffset);}
fs.writeFileSync(a.out,JSON.stringify({source:'PRG0 unreset pipe InitializeArea and header-driven PlayerEntrance through first control',runs})+'\n');console.log(runs.map(r=>[r.level,r.rows.length]));

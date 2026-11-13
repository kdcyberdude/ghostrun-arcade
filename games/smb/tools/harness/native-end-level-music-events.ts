/** Authenticate every retained/mood end-level music transition and sequence.
 * npx tsx tools/harness/native-end-level-music-events.ts --traces DIR --corpus DIR --out JSON */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {seedNativeEndLevelMusic,tickNativeEndLevelMusic} from '../../src/native-event-music.js';
const {values:a}=parseArgs({options:{traces:{type:'string'},corpus:{type:'string'},out:{type:'string'}}});
if(!a.out||!a.traces&&!a.corpus)throw Error('--out and trace input required');
const sources:{kind:string;id:string;directory:string}[]=[];
if(a.traces)for(const id of fs.readdirSync(a.traces).sort())if(fs.existsSync(path.join(a.traces,id,'ram.bin')))sources.push({kind:'v2',id,directory:path.join(a.traces,id)});
if(a.corpus)for(const id of fs.readdirSync(path.join(a.corpus,'captures')).sort())sources.push({kind:'mood',id,directory:path.join(a.corpus,'captures',id)});
const transitions=new Map<string,any>(),receipts=[],sequences=[],diagnostics=[];let frames=0,rows=0;
for(const source of sources){
 const bytes=fs.readFileSync(path.join(source.directory,'ram.bin')),initial=fs.readFileSync(path.join(source.directory,'initial.ram')),ramSha256=createHash('sha256').update(bytes).digest('hex');frames+=bytes.length/2048;
 const capture=path.join(source.directory,'capture.json');if(fs.existsSync(capture)&&JSON.parse(fs.readFileSync(capture,'utf8')).ramSha256!==ramSha256)throw Error(`RAM hash changed ${source.id}`);
 receipts.push({input:source.kind,id:source.id,frames:bytes.length/2048,ramSha256});let start:number|undefined;
 for(let row=0;row<bytes.length/2048;row++){
  const r=bytes.subarray(row*2048,(row+1)*2048),p=row?bytes.subarray((row-1)*2048,row*2048):initial;
  if(p[0x7b1]!==32&&p[0xfc]!==32)continue;rows++;
  const before=seedNativeEndLevelMusic(p),after=seedNativeEndLevelMusic(r),input={operMode:p[0x770],pauseMode:p[0x7c6],pauseQueue:p[0xfa],eventQueue:p[0xfc],areaQueue:p[0xfb]},predicted={...before};tickNativeEndLevelMusic(predicted,input);
  const context={input:source.kind,id:source.id,row,level:`${p[0x75f]+1}-${p[0x75c]+1}`,engine:p[14],modeTask:p[0x772],starFlagTask:p[0x746],frame:p[9]};
  if(JSON.stringify(predicted)!==JSON.stringify(after))diagnostics.push({...context,before,after,predicted,clockInput:input,currentQueue:r[0xfc],counterAfter:r[9]});
  const key=JSON.stringify({before,input,after});let e=transitions.get(key);if(!e){e={before,input,after,count:0,examples:[]};transitions.set(key,e);}e.count++;if(e.examples.length<3)e.examples.push(context);
  if(p[0xfc]===32&&r[0x7b1]===32)start=row;
  if(p[0x7b1]===32&&r[0x7b1]!==32){sequences.push({...context,start,end:row,startIncluded:start!==undefined,afterBuffer:r[0x7b1],queue:input.eventQueue});start=undefined;}
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'SoundEngine runs before gameplay. Adjacent native RAM states supply prior queues and square2 clock; all $20 active/queued rows included, with no fitted duration or skipped frame exceptions.',inputs:sources.length,frames,rows,receipts,transitions:[...transitions.values()],sequences,diagnostics},null,2)+'\n');console.log(JSON.stringify({inputs:sources.length,frames,rows,transitions:transitions.size,sequences:sequences.length,diagnostics:diagnostics.length}));

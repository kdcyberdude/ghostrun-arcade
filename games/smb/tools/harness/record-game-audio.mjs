#!/usr/bin/env node
/** Game canvas + actual AudioEngine, driven by one immutable input clock. No website chrome or replacement soundtrack. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {decodeEntrance} from './native-entrance.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {values:a}=parseArgs({options:{transport:{type:'string',default:'legacy-queue'},entrance:{type:'string'},actions:{type:'string',default:'data/observed-winning-inputs.json'},out:{type:'string'},frames:{type:'string'},fps:{type:'string'},port:{type:'string',default:'53948'},view:{type:'string',default:'2d'},resolution:{type:'string',default:'1K'},bitrate:{type:'string'}}});
assert.ok(['2d','3d'].includes(a.view),'--view is 2d or 3d');
assert.ok(a.out,'--out required, must not exist');assert.ok(['legacy-queue','direct-ppu'].includes(a.transport));
const source=path.resolve(root,a.actions),bytes=await fs.readFile(source),log=JSON.parse(bytes);
if(a.transport==='direct-ppu')assert.equal(log.clock,'ppu_frame','Direct input requires an explicit PPU-frame source');
let entrance,entranceReceipt,offset=0;
if(a.entrance){entranceReceipt=JSON.parse(await fs.readFile(a.entrance,'utf8'));assert.equal(entranceReceipt.actionsSha256,createHash('sha256').update(bytes).digest('hex'));const ram=await fs.readFile(path.join(path.dirname(a.entrance),'initial.ram'));assert.equal(entranceReceipt.initialRamSha256,createHash('sha256').update(ram).digest('hex'));entrance=decodeEntrance(ram,entranceReceipt);offset=entranceReceipt.sourceFrameOffset;assert.ok(Number.isInteger(offset)&&offset>=0);}
let skip=offset;const actions=[];for(const [mask,count] of log.actions){const removed=Math.min(skip,count);skip-=removed;if(count>removed)actions.push([mask,count-removed]);}assert.equal(skip,0);
const total=actions.reduce((n,r)=>n+r[1],0),frames=Number(a.frames??(entrance?total:720));
const rateSource=await fs.readFile(path.join(root,'src/simulation.ts'),'utf8'),rateMatch=rateSource.match(/export const NATIVE_HZ=([0-9.]+);/);assert.ok(rateMatch,'Cannot resolve authoritative simulation clock');const fps=Number(a.fps??rateMatch[1]);
assert.ok(entrance||['standard reset','reference_lab_standard_reset','power_on'].includes(log.start));
assert.ok(entrance||(!(log.route_offset_frames??0)&&!(log.level_index??0)),'Independent entrances need a reference-observed state, not just a level label');
for(const r of log.actions)assert.ok(Array.isArray(r)&&r.length===2&&Number.isInteger(r[0])&&r[0]>=0&&r[0]<=255&&Number.isInteger(r[1])&&r[1]>0);
assert.ok(Number.isInteger(frames)&&frames>0&&frames<=total);assert.ok(fps>0&&fps<=120);
const out=path.resolve(a.out);await fs.mkdir(out,{recursive:false});await fs.writeFile(path.join(out,'source-actions.json'),bytes);
const sourceHashes=Object.fromEntries(await Promise.all(['src/simulation.ts','src/main.ts','src/audio.ts','src/renderer.ts','tools/harness/offline-audio.mjs','tools/harness/native-entrance.mjs',...(a.view==='3d'?['src/render3d/index.ts','src/render3d/world.ts','src/render3d/proc.ts','assets3d/models/index.json']:[])].map(async file=>[file,createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex')])));
const server=await createServer({root,server:{host:'127.0.0.1',port:Number(a.port),strictPort:true,hmr:false,watch:null},logLevel:'error'});
let browser,capturedFrames=0,outcome;const errors=[];const video=await fs.open(path.join(out,'video.h264'),'wx');
try{
 await server.listen();browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),args:['--no-sandbox',...(process.platform==='darwin'?['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']:a.view==='3d'?['--enable-webgl','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist']:['--use-angle=swiftshader','--enable-unsafe-swiftshader'])]});
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${a.port}/${a.view==='3d'?`?view=3d&res=${encodeURIComponent(a.resolution)}`:''}`);await page.waitForFunction(()=>window.mario?.ready,null,{timeout:90000});
 const codec=await page.evaluate(async({acceleration,bitrate,actions,frames,fps,playing,entrance,transport,offset})=>{
  const {AudioEngine}=await import('/src/audio.ts');const commands=[],timestamps=[],states=[];let depth=0,frame=0,lastPaused=false;
  // Observe the existing game's public audio commands, including its exact alias routing.
  for(const name of ['playMusic','stopMusic','effect','setPaused','setMuted']){
   const original=AudioEngine.prototype[name];AudioEngine.prototype[name]=function(...args){
    if(!depth&&(name!=='setPaused'||args[0]!==lastPaused)){commands.push({frame,name,args});if(name==='setPaused')lastPaused=args[0];}
    depth++;try{return original.apply(this,args);}finally{depth--;}
   };
  }
  const canvas=document.querySelector('#game'),png=canvas.toDataURL;canvas.toDataURL=()=> 'data:image/png;base64,';
  window.mario.reset({playing});let initialization;
  if(entrance){const {initializeEntrance}=await import('/tools/harness/native-entrance.mjs');initialization=initializeEntrance(window.marioDebug.simulation,entrance);window.mario.step([],0);}
  const simulation=window.marioDebug.simulation;if(transport==='direct-ppu')simulation.inputs=[];
  const inputFrames=[];let effectiveMask=0;const update=simulation.update.bind(simulation),inputNames=['up','down','left','right','a','b','start','select'];simulation.update=buttons=>{effectiveMask=inputNames.reduce((mask,name,i)=>mask|(buttons.has(name)?1<<i:0),0);return update(buttons);};
  const config={codec:'avc1.420033',width:canvas.width,height:canvas.height,bitrate:bitrate,framerate:fps,latencyMode:'realtime',hardwareAcceleration:acceleration,avc:{format:'annexb'}};
  if(!(await VideoEncoder.isConfigSupported(config)).supported)throw Error('H264 unavailable');
  let chunks=[],encoded=0,failure,run=0,remaining=actions[0][1],limit=frames,terminal,seenPlay=playing;const names=['up','down','left','right','a','b','start','select'];
  const encoder=new VideoEncoder({output:c=>{const b=new Uint8Array(c.byteLength);c.copyTo(b);chunks.push(b);timestamps.push({timestamp:c.timestamp,duration:c.duration});encoded++;},error:e=>failure=e.message});encoder.configure(config);
  const b64=bytes=>{let s='';for(let n=0;n<bytes.length;n+=32768)s+=String.fromCharCode(...bytes.subarray(n,n+32768));return btoa(s);};
  window.gameAudioCapture={commands,timestamps,states,inputFrames,initialization,initialState:structuredClone(window.marioDebug.snapshot()),AudioEngine,b64,async batch(){
   const end=Math.min(limit,frame+120);let first;
   while(frame<end){
    const mask=actions[run][0],queued=simulation.inputs[0],applied=((queued?names.reduce((m,name,i)=>m|(queued.has(name)?1<<i:0),0):mask)&63)|(mask&192);
    const reply=window.mario.step(names.filter((_,i)=>mask&(1<<i)),1);inputFrames.push([offset+frame,mask,applied,effectiveMask]);
    if(transport==='direct-ppu'&&applied!==mask)throw Error('Direct transport changed a requested mask');
    const phase=window.marioDebug.simulation.phase;if(phase==='play')seenPlay=true;
    if(reply.framesAdvanced!==1&&!(reply.framesAdvanced===0&&phase==='title'&&!seenPlay))throw Error(`No advance at input frame ${frame}: phase ${phase}`);
    const transition=entrance&&window.marioDebug.simulation.level.id!==entrance.level;const stopped=Boolean(transition)||(seenPlay&&['gameover','ending','title'].includes(phase));
    if(frame===0)first=png.call(canvas,'image/png');
    if(frame%60===0||frame===frames-1||stopped)states.push({inputFrame:frame,state:structuredClone(window.marioDebug.snapshot())});
    const timestamp=Math.round(frame*1e6/fps),duration=Math.round((frame+1)*1e6/fps)-timestamp;
    const v=new VideoFrame(canvas,{timestamp,duration});encoder.encode(v,{keyFrame:frame%120===0});v.close();frame++;remaining--;
    if(!remaining&&frame<frames){run++;remaining=actions[run][1];}
    if(encoder.encodeQueueSize>=8)await encoder.flush();if(failure)throw Error(failure);
    if(stopped){limit=frame;terminal={phase,inputFrame:frame-1,...(transition?{reason:'observed level transition',fromLevel:entrance.level,toLevel:window.marioDebug.simulation.level.id}:{})};break;}
   }
   await encoder.flush();if(failure)throw Error(failure);
   const data=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let pos=0;for(const c of chunks){data.set(c,pos);pos+=c.length;}chunks=[];
   if(frame===limit){encoder.close();canvas.toDataURL=png;}
   return {data:b64(data),first,frame,encoded,terminal,done:frame===limit};
  }};return config;
 },{acceleration:process.platform==='darwin'?'prefer-hardware':'no-preference',bitrate:Number(a.bitrate??(a.view==='3d'?12000000:2000000)),actions,frames,fps,playing:Boolean(entrance)||log.start!=='power_on',entrance,transport:a.transport,offset});
 for(;;){const b=await page.evaluate(()=>window.gameAudioCapture.batch());assert.equal(b.frame,b.encoded,'Video frames dropped');await video.write(Buffer.from(b.data,'base64'));if(b.first)await fs.writeFile(path.join(out,'first.png'),Buffer.from(b.first.split(',')[1],'base64'));if(b.done){capturedFrames=b.frame;outcome=b.terminal??{phase:await page.evaluate(()=>window.marioDebug.simulation.phase),reason:'requested prefix ended'};break;}}
 await video.close();
 const audio=await page.evaluate(async({frames,fps})=>{
  const cap=window.gameAudioCapture,tracks=await fetch('/data/audio-tracks.json').then(r=>r.json());
  const {renderAudioCommands}=await import('/tools/harness/offline-audio.mjs');
  const {pcm,...result}=await renderAudioCommands(cap.AudioEngine,[...cap.commands],frames,fps,tracks);
  cap.pcm=new Uint8Array(pcm.buffer);
  return {...result,byteLength:cap.pcm.length,timestamps:cap.timestamps,states:cap.states,inputFrames:cap.inputFrames,initialization:cap.initialization,initialState:cap.initialState};
 },{frames:capturedFrames,fps});
 const pcm=await fs.open(path.join(out,'audio.f32le'),'wx');for(let offset=0;offset<audio.byteLength;offset+=1048576){const b=await page.evaluate(offset=>{const c=window.gameAudioCapture;return c.b64(c.pcm.subarray(offset,offset+1048576));},offset);await pcm.write(Buffer.from(b,'base64'));}await pcm.close();
 assert.deepEqual(audio.errors,[]);assert.ok(audio.peak>0,'Silent audio');assert.deepEqual(errors,[]);assert.equal(audio.timestamps.length,capturedFrames);
 for(let i=0;i<capturedFrames;i++)assert.equal(audio.timestamps[i].timestamp,Math.round(i*1e6/fps));
 const maxAudioTimingErrorSeconds=Math.max(0,...audio.timings.map(t=>Math.abs(t.actualSeconds-t.targetSeconds)));assert.ok(maxAudioTimingErrorSeconds<=128/audio.sampleRate+1e-6,'Audio schedule missed render quantum');
 const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-n','-fflags','+genpts','-r',String(fps),'-f','h264','-i',path.join(out,'video.h264'),'-f','f32le','-ar',String(audio.sampleRate),'-ac','2','-i',path.join(out,'audio.f32le'),'-c:v','copy','-c:a','aac','-threads','1','-b:a','192k','-movflags','+faststart',path.join(out,'game.mp4')],{stdio:['ignore','ignore','inherit']});assert.equal((await once(ff,'close'))[0],0);
 const report={view:a.view,...(a.view==='3d'?{resolution:a.resolution}:{}),source,sourceHashes,sourceClock:log.clock??'Not declared in source JSON; one input duration unit per simulation step',actionsSha256:createHash('sha256').update(bytes).digest('hex'),start:log.start,inputTransport:a.transport,inputColumns:['sourceFrame','requestedMask','transportAppliedMask','effectiveMaskAfterGameControlFilters'],inputFrames:audio.inputFrames,sourceFrameOffset:offset,entranceReceipt,initialization:audio.initialization,requestedFrames:frames,frames:capturedFrames,outcome,fps,durationSeconds:capturedFrames/fps,simulationHz:Number(rateMatch[1]),samplesPerFrame:audio.sampleRate/fps,codec,initialState:audio.initialState,audio:{...audio,states:undefined,timestamps:undefined,initialState:undefined,initialization:undefined,inputFrames:undefined},maxAudioTimingErrorSeconds,states:audio.states,timestamps:audio.timestamps,errors,method:'Game canvas only. Every retained source-prefix action is stepped once; capture stops on natural game-over/ending, an independently initialized level transition, or the requested prefix limit. Actual AudioEngine public calls recorded from the same simulation and rendered through OfflineAudioContext with its real source buffers, loops, channel replacement and onended callbacks. Common video/audio epoch; frame boundaries are exact, audio event scheduling quantized to one 128-sample Web Audio block. No replacement soundtrack, source action changes, or mid-run state correction.'};
 await fs.writeFile(path.join(out,'capture.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,frames:capturedFrames,requestedFrames:frames,outcome,fps,audioPeak:audio.peak,audioCommands:audio.timings.length,maxAudioTimingErrorSeconds}));
}finally{await video.close().catch(()=>{});await browser?.close();await server.close();}

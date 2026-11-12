#!/usr/bin/env node
// Capture unchanged controller actions in either renderer. Audio is intentionally omitted: offline stepping is not wall-clock playback.
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

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const names=['up','down','left','right','a','b','start','select'];
function validate(log){
 assert.ok(['standard reset','reference_lab_standard_reset','power_on'].includes(log.start),'Saved level entrances require a proven matching initial state; this recorder accepts standard reset or power_on only');
 assert.ok((log.route_offset_frames??0)===0&&(log.level_index??0)===0,'Partial-level logs need their full preceding action prefix');
 assert.ok(Array.isArray(log.actions)&&log.actions.length>0,'Missing action runs');
 for(const run of log.actions){assert.ok(Array.isArray(run)&&run.length===2);assert.ok(Number.isInteger(run[0])&&run[0]>=0&&run[0]<=255);assert.ok(Number.isInteger(run[1])&&run[1]>0);}
 return log.actions.reduce((n,run)=>n+run[1],0);
}
const {values:a}=parseArgs({options:{actions:{type:'string',default:'data/observed-winning-inputs.json'},out:{type:'string'},view:{type:'string',default:'2d'},from:{type:'string',default:'0'},frames:{type:'string',default:'600'},resolution:{type:'string',default:'1080p'},port:{type:'string',default:'53946'},webcodecs:{type:'boolean'},'self-test':{type:'boolean'}}});
if(a['self-test']){
 assert.equal(validate({start:'standard reset',actions:[[40,7],[0,8]]}),15);
 assert.equal(validate({start:'reference_lab_standard_reset',level_index:0,actions:[[40,7]]}),7);
 for(const log of [{start:'reference_lab_standard_reset',route_offset_frames:1983,actions:[[0,1]]},{start:'standard reset',level_index:1,actions:[[0,1]]},{start:'level_start',actions:[[0,1]]},{start:'power_on',actions:[[256,1]]},{start:'power_on',actions:[[0,0]]}])assert.throws(()=>validate(log));
 console.log('record-route input checks PASS');process.exit(0);
}
assert.ok(a.out,'--out is required and must not exist');assert.ok(['2d','25d'].includes(a.view));
const bytes=await fs.readFile(path.resolve(root,a.actions)),log=JSON.parse(bytes),total=validate(log),from=Number(a.from),count=Number(a.frames);
assert.ok(Number.isInteger(from)&&from>=0&&Number.isInteger(count)&&count>0&&from+count<=total,'Capture interval exceeds action stream');
const out=path.resolve(a.out);await fs.mkdir(out,{recursive:false});
const server=await createServer({root,server:{host:'127.0.0.1',port:Number(a.port),strictPort:true,hmr:false,watch:null},logLevel:'error'});
let browser,page,encoder,encoding;let completed=false;const errors=[],snapshots=[],levelChanges=[];
try{
 await server.listen();
 const graphics=process.env.GHOSTRUN_NATIVE_GPU==='1'?(process.platform==='darwin'?['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']:[]):['--use-angle=swiftshader','--enable-unsafe-swiftshader'];
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),args:['--no-sandbox',...graphics]});
 page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${a.port}/?view=${a.view}&res=${encodeURIComponent(a.resolution)}`);
 await page.waitForFunction(()=>window.mario?.ready,null,{timeout:120000});
 await page.evaluate(playing=>window.mario.reset({playing}),log.start!=='power_on');
 let written=0,codec;
 if(a.webcodecs){
  codec=await page.evaluate(async({actions,from,count,names})=>{
   if(!window.VideoEncoder||!window.VideoFrame)throw Error('WebCodecs is unavailable; omit --webcodecs to use PNG capture');
   const canvas=document.querySelector('#game'),original=canvas.toDataURL;
   const config={codec:'avc1.420033',width:canvas.width,height:canvas.height,bitrate:Math.max(2000000,Math.round(canvas.width*canvas.height*8)),framerate:60,latencyMode:'realtime',hardwareAcceleration:'prefer-hardware',avc:{format:'annexb'}};
   const support=await VideoEncoder.isConfigSupported(config);
   if(!support.supported)throw Error('H.264 WebCodecs configuration is unsupported; omit --webcodecs to use PNG capture');
   let chunks=[],failure,encoded=0,frame=0,written=0,run=0,remaining=actions[0][1],lastLevel;
   const encoder=new VideoEncoder({output:chunk=>{const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push(bytes);encoded++;},error:error=>{failure=error.message;}});
   encoder.configure(config);canvas.toDataURL=()=> 'data:image/png;base64,';
   window.__ghostrunCapture={config,async batch(){
    const levelChanges=[],snapshots=[];let first,produced=0;
    while(frame<from+count&&produced<240){
     const buttons=names.filter((_,i)=>actions[run][0]&(1<<i));
     const n=frame<from?Math.min(remaining,from-frame,240):1;
     const reply=window.mario.step(buttons,n);
     if(reply.framesAdvanced!==n)throw Error(`Controller advanced ${reply.framesAdvanced}, expected ${n}`);
     frame+=n;remaining-=n;
     if(frame>from){
      const level=window.marioDebug.simulation.level.id;
      if(level!==lastLevel){levelChanges.push({videoFrame:written,sourceFrame:frame-1,level});lastLevel=level;}
      if(written===0)first=original.call(canvas,'image/png');
      if(written%60===0||written===count-1)snapshots.push({sourceFrame:frame-1,state:structuredClone(window.marioDebug.snapshot())});
      const timestamp=Math.round(written*1000000/60),duration=Math.round((written+1)*1000000/60)-timestamp;
      const videoFrame=new VideoFrame(canvas,{timestamp,duration});
      try{encoder.encode(videoFrame,{keyFrame:written%120===0});}finally{videoFrame.close();}
      written++;produced++;
      if(encoder.encodeQueueSize>=8)await encoder.flush();
      if(failure)throw Error(`WebCodecs failed: ${failure}`);
     }
     if(!remaining&&frame<from+count){run++;remaining=actions[run][1];}
    }
    await encoder.flush();if(failure)throw Error(`WebCodecs failed: ${failure}`);
    const bytes=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}chunks=[];
    let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return {data:btoa(binary),first,levelChanges,snapshots,written,encoded,done:frame===from+count};
   },close(){canvas.toDataURL=original;if(encoder.state!=='closed')encoder.close();}};
   return config;
  },{actions:log.actions,from,count,names});
  encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-n','-fflags','+genpts','-r','60','-f','h264','-i','pipe:0','-an','-c:v','copy','-movflags','+faststart',path.join(out,'route.mp4')],{stdio:['pipe','ignore','inherit']});
  encoding=once(encoder,'close');encoder.stdin.on('error',e=>errors.push(e.message));
  for(;;){
   const batch=await page.evaluate(()=>window.__ghostrunCapture.batch());
   if(!encoder.stdin.write(Buffer.from(batch.data,'base64')))await once(encoder.stdin,'drain');
   if(batch.first)await fs.writeFile(path.join(out,'first.png'),Buffer.from(batch.first.split(',')[1],'base64'));
   snapshots.push(...batch.snapshots);levelChanges.push(...batch.levelChanges);written=batch.written;
   assert.equal(batch.encoded,written,'WebCodecs dropped or duplicated a frame');
   if(batch.done)break;
  }
 }else{
 encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-n','-f','image2pipe','-framerate','60','-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-threads','1','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'route.mp4')],{stdio:['pipe','ignore','inherit']});
 encoding=once(encoder,'close');encoder.stdin.on('error',e=>errors.push(e.message));
 let frame=0;
 for(const [mask,duration] of log.actions){
  const buttons=names.filter((_,i)=>mask&(1<<i));let remaining=duration;
  while(remaining&&frame<from+count){
   const n=frame<from?Math.min(remaining,from-frame,240):1;
   const reply=await page.evaluate(({buttons,n})=>({...window.mario.step(buttons,n),level:window.marioDebug.simulation.level.id}),{buttons,n});
   assert.equal(reply.framesAdvanced,n,'Controller did not advance the requested number of frames');frame+=n;remaining-=n;
   if(frame>from){
    if(levelChanges.at(-1)?.level!==reply.level)levelChanges.push({videoFrame:written,sourceFrame:frame-1,level:reply.level});
    const png=Buffer.from(reply.image.split(',')[1],'base64');
    if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');
    if(written===0)await fs.writeFile(path.join(out,'first.png'),png);
    if(written%60===0||written===count-1)snapshots.push({sourceFrame:frame-1,state:await page.evaluate(()=>window.marioDebug.snapshot())});
    written++;
   }
  }
  if(frame>=from+count)break;
 }
 }
 encoder.stdin.end();const [code]=await encoding;assert.equal(code,0,'ffmpeg failed');assert.equal(written,count);assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'capture.json'),JSON.stringify({view:a.view,source:path.resolve(root,a.actions),actionsSha256:createHash('sha256').update(bytes).digest('hex'),start:log.start,clock:log.clock??'legacy CPU-cycle slices',from,frames:count,fps:60,audio:false,encoding:a.webcodecs?'WebCodecs H264 AnnexB; explicit microsecond timestamps; MP4 stream copy':'PNG pipe to libx264',codec,method:'One reset, unchanged recorded actions, no later state injection. Browser simulation snapshots are observations only. This is an open-loop replay, not model control or proof of native fidelity.',levelChanges,snapshots,errors},null,2)+'\n');
 completed=true;console.log(JSON.stringify({out,frames:count,view:a.view,last:snapshots.at(-1)?.state.phase}));
}finally{
 if(page)await page.evaluate(()=>{window.__ghostrunCapture?.close();delete window.__ghostrunCapture;}).catch(()=>{});
 if(!completed&&encoder)encoder.kill('SIGTERM');await browser?.close();await server.close();
}

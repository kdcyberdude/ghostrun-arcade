/** Actual every-frame audit: continuous inputs, no reset/recovery after divergence.
 * State verdicts come from native-state-replay.ts (same comparators, plain-Node bundle; equal to the
 * former in-browser readout on every frame of the cca2e44 audit). The browser only draws and compares pictures.
 * --levels 1-1[,..]: compare only native frames of those levels; replay stops after the last one,
 * the remaining native picture stream is still hashed. Nonselected rows stay unchecked.
 * Native lag frames (native-lag-frames.mjs): the remake is not stepped on that input and the row is unchecked. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import {execFileSync} from 'node:child_process';import {createServer} from 'vite';import {chromium} from 'playwright';import {PNG} from 'pngjs';
import {decodeEntrance} from './native-entrance.mjs';import {bundleStateReplay,replayStateInWorker,levelAt} from './native-state-replay.js';import {nativeLagFrames} from './native-lag-frames.mjs';
import {auditSourceHashes,verifyAuditSource,sourceManifestHash} from './native-monitor/source-provenance.mjs';
import {policy,policyHash} from './native-monitor/visual-check.mjs';import {inventoryHash,counting,validateScope} from './native-monitor/combined-replay.mjs';
const {values:a}=parseArgs({options:{monitor:{type:'string'},out:{type:'string'},ids:{type:'string'},levels:{type:'string'},jobs:{type:'string',default:'1'},batch:{type:'string',default:'16'},port:{type:'string',default:'54021'},dump:{type:'string'},'pilot-frames':{type:'string'},windows:{type:'string'}}});if(!a.monitor||!a.out)throw Error('--monitor and --out required');
const batch=Number(a.batch),pilot=a['pilot-frames']?Number(a['pilot-frames']):undefined;if(!Number.isInteger(batch)||batch<1||batch>32||pilot!==undefined&&(!a.ids||!Number.isInteger(pilot)||pilot<1||pilot>512))throw Error('batch1..32; pilot requires explicit ids and1..512 frames');
// --windows FILE: {id:[[from,to],...]} re-checks only those frames (a targeted re-verification, never a level total): other frames are
// still drawn (skipping draws left stale renderer state: whole later recordings mismatched) but not compared, and the run stops after the last window.
const windows:Record<string,[number,number][]>|undefined=a.windows?JSON.parse(fs.readFileSync(a.windows,'utf8')):undefined;
const scope=a.levels?validateScope({levels:a.levels.split(',').filter(Boolean),frameSelection:'all-target-level-frames'}):undefined;
const monitor=path.resolve(a.monitor),root=path.resolve('games/smb'),recovered='/home/kd/Desktop/proj/ghostrun/notes/smb-native-handoff/recovered-native',read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8')),sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const inventory=read(path.join(monitor,'combined-inputs.json')).runs,runtimeCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
execFileSync('git',['diff','--exit-code',runtimeCommit,'--','games/smb/src','games/smb/data'],{stdio:'pipe'});
const sourceHashes=auditSourceHashes(root),manifestHash=sourceManifestHash(sourceHashes);
const paletteSource=fs.readFileSync(path.join(root,'tools/harness/native-pixels.ts'),'utf8'),palette=paletteSource.match(/const remakeRgb=\[([\s\S]*?)\];/)![1].match(/0x[0-9a-f]+/g)!.map(x=>parseInt(x));
const fceux=fs.readFileSync('/home/kd/Desktop/proj/ghostrun/ghostrun-lab/rl/fceux_palette.py','utf8'),rgb=Array.from(fceux.matchAll(/\((\d+), (\d+), (\d+)\)/g),m=>[Number(m[1]),Number(m[2]),Number(m[3])]);if(rgb.length!==512)throw Error('Expected512 palette');
const report:any={schema:'smb-combined-replay-v2',...(windows?{frameWindows:{file:path.resolve(a.windows!),sha256:sha(fs.readFileSync(a.windows!))}}:{}),counting,unit:'input-frame',...(scope?{scope}:{}),protocol:'continuous-from-recorded-start',runtimeCommit,inventorySha256:inventoryHash(inventory),visualPolicyHash:policyHash,toolSha256:sha(fs.readFileSync(new URL(import.meta.url))),sourceHashes,paletteSha256:sha(fceux),runs:[],errors:[],progress:{status:'running',done:0,total:inventory.length,started:new Date().toISOString(),updated:null,finished:null,active:[],directlyComparedFrames:0}};
fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});const checkpoint=()=>{report.progress.updated=new Date().toISOString();report.progress.done=report.runs.length;report.progress.directlyComparedFrames=report.runs.reduce((n:number,r:any)=>n+r.directlyComparedFrames,0);fs.writeFileSync(a.out+'.partial',JSON.stringify(report)+'\n');fs.renameSync(a.out+'.partial',a.out!);};checkpoint();
process.on('uncaughtExceptionMonitor',error=>{report.errors.push({error:String(error)});report.progress.status='failed';checkpoint();});
// Native picture batches go to the page as binary HTTP bodies: the same bytes Node just read and hashed.
// (Base64 strings through page.evaluate cost ~1.5ms per frame of protocol transfer.)
const feed=new Map<string,Buffer>();let feedKey=0;
// Inline config (vite.config.ts only adds build/watch settings): no config-file watcher per shard, which exhausted inotify instances at 20+ shards.
const server=await createServer({root,configFile:false,optimizeDeps:{entries:['index.html']},server:{host:'127.0.0.1',port:Number(a.port),strictPort:true,hmr:false,watch:null},logLevel:'error',plugins:[{name:'native-feed',configureServer(s){s.middlewares.use((req,res,next)=>{if(!req.url?.startsWith('/__native-feed/'))return next();const key=req.url.slice('/__native-feed/'.length),body=feed.get(key);feed.delete(key);if(!body){res.statusCode=404;res.end();return;}res.setHeader('content-type','application/octet-stream');res.end(body);});}}]});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const selected=a.ids?inventory.filter((r:any)=>a.ids!.split(',').includes(r.id)):inventory;if(a.ids&&selected.length!==new Set(a.ids.split(',')).size)throw Error('Unknown/duplicate input ids');let cursor=0;
const names=['a','b','select','start','up','down','left','right'],stateBundle=await bundleStateReplay();
function span(out:any[],f:number,level:string|null,state:string,picture:string){const last=out.at(-1);if(last&&last.to===f&&last.level===level&&last.state===state&&last.picture===picture)last.to++;else out.push({from:f,to:f+1,level,state,picture});}
async function audit(input:any,page:any){
 const auditStarted=performance.now(),warmup=Math.max(8,batch);let steadyStarted:number|undefined;
 const original=input.id.startsWith('original:'),level=original?input.id.split(':')[1]:undefined,dir=original?path.join(recovered,'original32/traces',level!):path.join(recovered,'moods/captures',input.padsSha256),pixelDir=original?dir:path.join(dir,'pixels');
 const meta=read(path.join(pixelDir,'pixels.json')),initial=fs.readFileSync(path.join(dir,'initial.ram')),pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin'));
 if(sha(pads)!==input.padsSha256||pads.length!==input.frames||ram.length!==pads.length*2048||sha(ram)!==meta.ramSha256||meta.padSha256!==input.padsSha256||meta.frames!==pads.length||meta.step!==1)throw Error('Native input/RAM/length authentication');
 if(sha(initial)!==(original?input.initialRamSha256:read(path.join(dir,'capture.json')).initialRamSha256))throw Error('Native initialRAM differs');
 if(fs.statSync(path.join(pixelDir,'pixels.bin')).size!==pads.length*240*224||fs.statSync(path.join(pixelDir,'emph.bin')).size!==pads.length*224)throw Error('Native picture length');
 const labels=Array.from({length:pads.length},(_,f)=>levelAt(ram.subarray(f*2048,(f+1)*2048))),win=windows?.[input.id]??(windows?[]:undefined),inLevels=(f:number)=>!scope||scope.levels.includes(labels[f]!),chosen=(f:number)=>inLevels(f)&&(!win||win.some(([a,b])=>f>=a&&f<b));
 const lag=new Set<number>(nativeLagFrames(ram));let end=pads.length;if(scope){end=0;for(let f=0;f<pads.length;f++)if(inLevels(f))end=f+1;}
 const winEnd=win?Math.max(0,...win.map(([,b])=>b)):end,limit=Math.min(pilot===undefined?end:Math.min(pilot,end),winEnd),entrance=original?decodeEntrance(initial,read(path.join(recovered,'original32/entrances',level!,'entrance.json'))):undefined;
 // State runs in a child process while this process drives the pictures.
 const statePromise=replayStateInWorker(stateBundle.file,monitor,input.id,scope?.levels);statePromise.catch(()=>{});
 await page.evaluate(async({entrance,original,rgb,palette,policy}:any)=>{
  const w=window as any,canvas=document.querySelector('#game') as HTMLCanvasElement;canvas.toDataURL=()=>'';w.mario.reset({playing:original});
  if(original){const {initializeEntrance}=await import(String('/tools/harness/native-entrance.mjs'));initializeEntrance(w.marioDebug.simulation,entrance);w.mario.step([],0);w.marioDebug.simulation.inputs=[];}
  // Read the renderer's own preserved drawing buffer (byte-identical to the former drawImage/getImageData crop).
  const gl=(canvas.getContext('webgl2')??canvas.getContext('webgl')) as WebGL2RenderingContext;if(!gl?.getContextAttributes()?.preserveDrawingBuffer)throw Error('Renderer drawing buffer unavailable');
  const {compareFrame}=await import(String('/tools/harness/native-monitor/visual-core.mjs')),mapping=new Map();palette.forEach((c:number,i:number)=>{if(!mapping.has(c))mapping.set(c,rgb[i]);});
  w.audit={gl,flip:new Uint8Array(240*224*4),compareFrame,rgb,palette,policy,mapping,native:new Uint8Array(240*224*4),work:{mismatch:new Uint8Array(240*224),queue:new Int32Array(240*224)},pictures:[]};
 },{entrance,original,rgb,palette,policy});
 const out:any={id:input.id,frames:input.frames,reseeded:false,nativeLagFrames:[...lag].filter(f=>f<limit),initialStateVerified:original,spans:[],directlyComparedFrames:0,firstFailure:null,stateAudit:null,provenance:{ramSha256:meta.ramSha256,initialRamSha256:sha(initial),nativePixelsSha256:meta.pixelsSha256,nativeEmphasisSha256:meta.emphasisSha256,lag:1,start:input.start,paletteNormalization:'native-pixels.ts native palette-index equivalence',fullPictureStreamAuthenticated:false}};
 const pixelFd=fs.openSync(path.join(pixelDir,'pixels.bin'),'r'),emphFd=fs.openSync(path.join(pixelDir,'emph.bin'),'r'),pixelsHash=createHash('sha256'),emphasisHash=createHash('sha256');
 const pictures:{status:string;picture?:any}[]=[],firstPictures=new Map<number,{pix:Buffer;emph:Buffer;i:number;remake?:Buffer}>();let candidate=-1;
 // --dump F,G: diagnostic only, saves native | remake | difference PNGs of those frames beside --out.
 const dumpFrames=new Set((a.dump??'').split(',').filter(Boolean).map(Number));
 try{
  for(let from=0;from<limit;from+=batch){
   const count=Math.min(batch,limit-from),body=Buffer.alloc(count*240*224+count*224),pix=body.subarray(0,count*240*224),emph=body.subarray(count*240*224);
   if(fs.readSync(pixelFd,pix,0,pix.length,from*240*224)!==pix.length||fs.readSync(emphFd,emph,0,emph.length,from*224)!==emph.length)throw Error('Native picture truncated');pixelsHash.update(pix);emphasisHash.update(emph);
   const key=String(++feedKey);feed.set(key,body);
   const compare=Array.from({length:count},(_,i)=>chosen(from+i)&&!lag.has(from+i)),skip=Array.from({length:count},(_,i)=>lag.has(from+i))
   const rows=await page.evaluate(async({key,count,pads,names,compare,skip}:any)=>{
    const w=window as any,a=w.audit,body=new Uint8Array(await (await fetch('/__native-feed/'+key)).arrayBuffer()),pix=body.subarray(0,count*240*224),emph=body.subarray(count*240*224),rows=[];a.pictures=[];
    for(let f=0;f<pads.length;f++){
     if(compare[f]){
      const gl=a.gl,remake=new Uint8ClampedArray(240*224*4);gl.readPixels(8,8,240,224,gl.RGBA,gl.UNSIGNED_BYTE,a.flip);for(let y=0;y<224;y++)remake.set(a.flip.subarray((223-y)*960,(224-y)*960),y*960);
      for(let y=0;y<224;y++)for(let x=0;x<240;x++){const k=y*240+x,index=pix[f*240*224+k],c=a.rgb[index|emph[f*224+y]<<6],j=k*4;if(!c)throw Error('Unknown emphasis');a.native[j]=c[0];a.native[j+1]=c[1];a.native[j+2]=c[2];a.native[j+3]=255;const packed=remake[j]<<16|remake[j+1]<<8|remake[j+2],mapped=a.palette[index]===packed?a.rgb[index]:a.mapping.get(packed);if(mapped){remake[j]=mapped[0];remake[j+1]=mapped[1];remake[j+2]=mapped[2];}}
      const picture=a.compareFrame(a.native,remake,240,224,a.policy,a.work);a.pictures.push(remake);rows.push({picture});
     }else{a.pictures.push(null);rows.push(null);}
     if(!skip[f])w.mario.step(names.filter((_:any,b:number)=>pads[f]&(1<<b)),1);
    }return rows;
   },{key,count,pads:Array.from(pads.subarray(from,from+count)),names,compare,skip});
   feed.delete(key);
   for(let i=0;i<count;i++){
    const f=from+i,row=rows[i];pictures[f]=row?{status:row.picture.status==='pass'?'match':'mismatch',picture:row.picture}:{status:'unchecked'};
    if(f+1===warmup)steadyStarted=performance.now();
    // Keep the remake image of the earliest picture mismatch (state is joined after the loop).
    if(row&&dumpFrames.has(f))firstPictures.set(f,{pix:Buffer.from(pix.subarray(i*240*224,(i+1)*240*224)),emph:Buffer.from(emph.subarray(i*224,(i+1)*224)),i});
    if(row&&candidate<0&&pictures[f].status==='mismatch'){candidate=f;firstPictures.set(f,{pix:Buffer.from(pix.subarray(i*240*224,(i+1)*240*224)),emph:Buffer.from(emph.subarray(i*224,(i+1)*224)),i});}
   }
   // Diagnostics need remake pixels only for a first failure; fetch them while this batch is still in the page.
   for(const [f,item]of firstPictures)if(!item.remake&&f>=from&&f<from+count)item.remake=Buffer.from(await page.evaluate((i:number)=>{const b=(window as any).audit.pictures[i];let s='';for(let j=0;j<b.length;j+=32768)s+=String.fromCharCode(...b.subarray(j,j+32768));return btoa(s);},item.i),'base64');
  }
  // Hash the unreplayed suffix so the complete native stream is authenticated; those frames stay unchecked.
  for(let from=limit;from<pads.length;from+=4096){const count=Math.min(4096,pads.length-from),pix=Buffer.alloc(count*240*224),emph=Buffer.alloc(count*224);if(fs.readSync(pixelFd,pix,0,pix.length,from*240*224)!==pix.length||fs.readSync(emphFd,emph,0,emph.length,from*224)!==emph.length)throw Error('Native picture truncated');pixelsHash.update(pix);emphasisHash.update(emph);}
 }finally{fs.closeSync(pixelFd);fs.closeSync(emphFd);}
 for(const f of dumpFrames){const item=firstPictures.get(f);if(!item?.remake)continue;const png=new PNG({width:720,height:224});
  for(let k=0;k<240*224;k++){const c=rgb[item.pix[k]|item.emph[Math.floor(k/240)]<<6],x=k%240,y=Math.floor(k/240),r=item.remake.subarray(k*4,k*4+3),diff=c[0]!==r[0]||c[1]!==r[1]||c[2]!==r[2];
   for(const [panel,v] of [[0,c],[1,r],[2,diff?[255,0,255]:[c[0]>>2,c[1]>>2,c[2]>>2]]] as const){const j=(y*720+panel*240+x)*4;png.data[j]=v[0];png.data[j+1]=v[1];png.data[j+2]=v[2];png.data[j+3]=255;}}
  const file=path.join(path.dirname(a.out!),'dump',`${input.id.replace(':','-').slice(0,20)}-${f}.png`);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,PNG.sync.write(png));}
 const state=await statePromise,stateAt:string[]=[];for(const s of state.spans)for(let f=s.from;f<s.to;f++)stateAt[f]=s.state;
 if(state.replayedFrames!==end||state.reference.ramSha256!==meta.ramSha256)throw Error('State replay covers a different native stream');
 if(original)out.stateAudit=state.strict;else{out.continuousState=state.continuous;out.initialStateVerified=state.start?.status==='match';}
 let pictureOnlyFirst=-1;
 for(let f=0;f<pads.length;f++){
  const inReplay=f<limit,keep=inReplay&&chosen(f),st=keep?stateAt[f]:'unchecked',pic=keep?pictures[f].status:'unchecked';
  span(out.spans,f,labels[f],st,pic);if(keep)out.directlyComparedFrames++;
  if(!out.firstFailure&&(st==='mismatch'||pic==='mismatch')){
   const raw=ram.subarray(f*2048,(f+1)*2048);
   out.firstFailure={frame:f,level:labels[f],state:st,fields:st==='mismatch'&&state.firstStateMismatch?.frame===f?state.firstStateMismatch.fields:[],picture:pictures[f].picture,nativeMode:raw[0x770],nativeTask:raw[0x772]};
   if(pic==='mismatch'&&f===candidate)pictureOnlyFirst=f;
  }
 }
 // Diagnostic side-by-side image: available when the first failure is the first picture mismatch.
 const first=firstPictures.get(pictureOnlyFirst);
 if(out.firstFailure&&first?.remake){
  const native=Buffer.alloc(240*224*4);for(let k=0;k<240*224;k++){const c=rgb[first.pix[k]|first.emph[Math.floor(k/240)]<<6];native[k*4]=c[0];native[k*4+1]=c[1];native[k*4+2]=c[2];native[k*4+3]=255;}
  Object.assign(out.firstFailure,{nativeFrameSha256:sha(native),remakeFrameSha256:sha(first.remake)});
  if(original||input.id===inventory[0].id){const png=new PNG({width:480,height:224});for(let y=0;y<224;y++){native.copy(png.data,y*480*4,y*240*4,(y+1)*240*4);first.remake.copy(png.data,(y*480+240)*4,y*240*4,(y+1)*240*4);}const filename=input.id.replace(':','-')+'.png';fs.mkdirSync(path.join(path.dirname(a.out!),'evidence'),{recursive:true});fs.writeFileSync(path.join(path.dirname(a.out!),'evidence',filename),PNG.sync.write(png));out.firstFailure.image=filename;}
 }
 if(scope){
  const ranges:{from:number;to:number}[]=[];for(const s of out.spans)if(scope.levels.includes(s.level)){const last=ranges.at(-1);if(last?.to===s.from)last.to=s.to;else ranges.push({from:s.from,to:s.to});}
  Object.assign(out,{selectedFrames:ranges.reduce((n,s)=>n+s.to-s.from,0),selectedFrameSpans:ranges,replayedFrames:limit});out.provenance.selectedFrameSpansSha256=sha(JSON.stringify(ranges));
 }
 out.timing={totalRunSeconds:(performance.now()-auditStarted)/1000,warmupFrames:Math.min(warmup,limit),steadyFrames:Math.max(0,limit-warmup),steadySeconds:steadyStarted===undefined?null:(performance.now()-steadyStarted)/1000,stateSeconds:state.seconds};
 out.provenance.observedPixelStreamSha256=pixelsHash.digest('hex');out.provenance.observedEmphasisStreamSha256=emphasisHash.digest('hex');
 // Bounded pilots are deliberately not valid completed-cohort receipts.
 if(limit===end){if(out.provenance.observedPixelStreamSha256!==meta.pixelsSha256||out.provenance.observedEmphasisStreamSha256!==meta.emphasisSha256)throw Error('Native streamed picture/emphasis hash mismatch');out.provenance.fullPictureStreamAuthenticated=true;}
 return out;
}
try{
 await Promise.all(Array.from({length:Math.min(Number(a.jobs),selected.length)},async()=>{const page=await browser.newPage();await page.goto(`http://127.0.0.1:${a.port}/`);await page.waitForFunction(()=>(window as any).mario?.ready,null,{timeout:90000});while(cursor<selected.length){const input=selected[cursor++];report.progress.active.push(input.id);checkpoint();try{const result=await audit(input,page);verifyAuditSource(process.cwd(),runtimeCommit,sourceHashes);Object.assign(result.provenance,{sourceVerifiedAfterRun:true,runtimeCommit,toolManifestSha256:manifestHash});report.runs.push(result);console.log(JSON.stringify({id:input.id,first:result.firstFailure?.frame??null,checked:result.directlyComparedFrames,done:report.runs.length,total:selected.length}));}catch(error){report.errors.push({id:input.id,error:String(error)});console.error(input.id,String(error));}finally{report.progress.active=report.progress.active.filter((id:string)=>id!==input.id);checkpoint();}}await page.close();}));
 verifyAuditSource(process.cwd(),runtimeCommit,sourceHashes);
 report.progress.status=report.errors.length?'incomplete':pilot!==undefined?'pilot-complete':selected.length===inventory.length?(scope?'scoped-complete':'complete'):'shard-complete';report.progress.finished=new Date().toISOString();checkpoint();
}finally{await browser.close();await server.close();fs.rmSync(stateBundle.dir,{recursive:true,force:true});}if(report.errors.length)process.exitCode=1;

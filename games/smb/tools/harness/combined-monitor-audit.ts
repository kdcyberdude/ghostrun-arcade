/** Actual every-frame audit: continuous inputs, no reset/recovery after divergence. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import {execFileSync} from 'node:child_process';import {createServer} from 'vite';import {chromium} from 'playwright';import {PNG} from 'pngjs';
import {decodeEntrance} from './native-entrance.mjs';import {strictCompare,type StrictFrameObservation} from './native-strict.js';import {LiveWorld1StateAudit,compareLiveWorld1Start} from './native-continuous-state.js';
import {policy,policyHash} from './native-monitor/visual-check.mjs';import {inventoryHash,counting} from './native-monitor/combined-replay.mjs';
const {values:a}=parseArgs({options:{monitor:{type:'string'},out:{type:'string'},ids:{type:'string'},jobs:{type:'string',default:'2'},batch:{type:'string',default:'8'},port:{type:'string',default:'54021'},'pilot-frames':{type:'string'}}});if(!a.monitor||!a.out)throw Error('--monitor and --out required');
const batch=Number(a.batch),pilot=a['pilot-frames']?Number(a['pilot-frames']):undefined;if(!Number.isInteger(batch)||batch<1||batch>32||pilot!==undefined&&(!a.ids||!Number.isInteger(pilot)||pilot<1||pilot>512))throw Error('batch1..32; pilot requires explicit ids and1..512 frames');
const monitor=path.resolve(a.monitor),root=path.resolve('games/smb'),recovered='/home/kd/Desktop/proj/ghostrun/notes/smb-native-handoff/recovered-native',read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8')),sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const inventory=read(path.join(monitor,'combined-inputs.json')).runs,runtimeCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
execFileSync('git',['diff','--exit-code',runtimeCommit,'--','games/smb/src','games/smb/data'],{stdio:'pipe'});
const dependencyFiles=[...fs.readdirSync(path.join(root,'tools/harness')).filter(f=>/^native-.*\.(ts|mjs)$/.test(f)).map(f=>path.join(root,'tools/harness',f)),...fs.readdirSync(path.join(root,'tools/harness/native-monitor')).map(f=>path.join(root,'tools/harness/native-monitor',f)),new URL(import.meta.url).pathname].sort();
const sourceHashes=Object.fromEntries(dependencyFiles.map(f=>[path.relative(root,f),sha(fs.readFileSync(f))]));
const paletteSource=fs.readFileSync(path.join(root,'tools/harness/native-pixels.ts'),'utf8'),palette=paletteSource.match(/const remakeRgb=\[([\s\S]*?)\];/)![1].match(/0x[0-9a-f]+/g)!.map(x=>parseInt(x));
const fceux=fs.readFileSync('/home/kd/Desktop/proj/ghostrun/ghostrun-lab/rl/fceux_palette.py','utf8'),rgb=Array.from(fceux.matchAll(/\((\d+), (\d+), (\d+)\)/g),m=>[Number(m[1]),Number(m[2]),Number(m[3])]);if(rgb.length!==512)throw Error('Expected512 palette');
const report:any={schema:'smb-combined-replay-v2',counting,unit:'input-frame',protocol:'continuous-from-recorded-start',runtimeCommit,inventorySha256:inventoryHash(inventory),visualPolicyHash:policyHash,toolSha256:sha(fs.readFileSync(new URL(import.meta.url))),sourceHashes,paletteSha256:sha(fceux),runs:[],errors:[],progress:{status:'running',done:0,total:inventory.length,started:new Date().toISOString(),updated:null,finished:null,active:[],directlyComparedFrames:0}};
fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});const checkpoint=()=>{report.progress.updated=new Date().toISOString();report.progress.done=report.runs.length;report.progress.directlyComparedFrames=report.runs.reduce((n:number,r:any)=>n+r.directlyComparedFrames,0);fs.writeFileSync(a.out+'.partial',JSON.stringify(report)+'\n');fs.renameSync(a.out+'.partial',a.out!);};checkpoint();
process.on('uncaughtExceptionMonitor',error=>{report.errors.push({error:String(error)});report.progress.status='failed';checkpoint();});
const server=await createServer({root,server:{host:'127.0.0.1',port:Number(a.port),strictPort:true,hmr:false,watch:null},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const selected=a.ids?inventory.filter((r:any)=>a.ids!.split(',').includes(r.id)):inventory;if(a.ids&&selected.length!==new Set(a.ids.split(',')).size)throw Error('Unknown/duplicate input ids');let cursor=0;
const names=['a','b','select','start','up','down','left','right'];
function levelAt(r:Uint8Array){const w=r[0x75f]+1,l=r[0x75c]+1;return [1,2,3].includes(r[0x770])&&w<=8&&l<=4?`${w}-${l}`:null;}
function span(out:any[],f:number,level:string|null,state:string,picture:string){const last=out.at(-1);if(last&&last.to===f&&last.level===level&&last.state===state&&last.picture===picture)last.to++;else out.push({from:f,to:f+1,level,state,picture});}
async function audit(input:any,page:any){
 const auditStarted=performance.now(),warmup=Math.max(8,batch);let steadyStarted:number|undefined;
 const original=input.id.startsWith('original:'),level=original?input.id.split(':')[1]:undefined,dir=original?path.join(recovered,'original32/traces',level!):path.join(recovered,'moods/captures',input.padsSha256),pixelDir=original?dir:path.join(dir,'pixels');
 const meta=read(path.join(pixelDir,'pixels.json')),initial=fs.readFileSync(path.join(dir,'initial.ram')),pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin'));
 if(sha(pads)!==input.padsSha256||pads.length!==input.frames||ram.length!==pads.length*2048||sha(ram)!==meta.ramSha256||meta.padSha256!==input.padsSha256||meta.frames!==pads.length||meta.step!==1)throw Error('Native input/RAM/length authentication');
 if(sha(initial)!==(original?input.initialRamSha256:read(path.join(dir,'capture.json')).initialRamSha256))throw Error('Native initialRAM differs');
 if(fs.statSync(path.join(pixelDir,'pixels.bin')).size!==pads.length*240*224||fs.statSync(path.join(pixelDir,'emph.bin')).size!==pads.length*224)throw Error('Native picture length');
 const limit=pilot===undefined?pads.length:Math.min(pilot,pads.length),entrance=original?decodeEntrance(initial,read(path.join(recovered,'original32/entrances',level!,'entrance.json'))):undefined;
 const observations:StrictFrameObservation[]=[],stateAudit=original?strictCompare(entrance,pads.subarray(0,limit),ram.subarray(0,limit*2048),level!,row=>observations[row.frame]=row):undefined;
 await page.evaluate(async({entrance,original,rgb,palette,policy}:any)=>{
  const w=window as any,canvas=document.querySelector('#game') as HTMLCanvasElement;canvas.toDataURL=()=>'';w.mario.reset({playing:original});
  if(original){const {initializeEntrance}=await import(String('/tools/harness/native-entrance.mjs'));initializeEntrance(w.marioDebug.simulation,entrance);w.mario.step([],0);w.marioDebug.simulation.inputs=[];}
  const crop=document.createElement('canvas');crop.width=240;crop.height=224;
  const {compareFrame}=await import(String('/tools/harness/native-monitor/visual-core.mjs')),mapping=new Map();palette.forEach((c:number,i:number)=>{if(!mapping.has(c))mapping.set(c,rgb[i]);});
  w.audit={ctx:crop.getContext('2d',{willReadFrequently:true}),compareFrame,capture:(await import(String('/tools/harness/native-continuous-state.ts'))).captureLiveWorld1State,rgb,palette,policy,mapping,native:new Uint8Array(240*224*4),work:{mismatch:new Uint8Array(240*224),queue:new Int32Array(240*224)},pictures:[]};
 },{entrance,original,rgb,palette,policy});
 const liveAudit=original?undefined:new LiveWorld1StateAudit(),startCheck=original?undefined:compareLiveWorld1Start(initial,await page.evaluate(()=>{const w=window as any;return w.audit.capture(w.marioDebug.simulation,true);}));
 const liveCoverage:any={scope:'continuous World1-1 and source-owned boot/title',start:startCheck,fullyComparedFrames:0,partiallyComparedFrames:0,uncheckedFrames:0,knownMismatchFrames:0,gaps:{}};
 const out:any={id:input.id,frames:input.frames,reseeded:false,initialStateVerified:original||startCheck?.status==='match',spans:[],directlyComparedFrames:0,firstFailure:null,stateAudit:stateAudit?{first:stateAudit.first,firstCoverageGap:stateAudit.firstCoverageGap,fields:stateAudit.fields}:null,...(!original?{continuousState:liveCoverage}:{}),provenance:{ramSha256:meta.ramSha256,initialRamSha256:sha(initial),nativePixelsSha256:meta.pixelsSha256,nativeEmphasisSha256:meta.emphasisSha256,lag:1,start:input.start,paletteNormalization:'native-pixels.ts native palette-index equivalence',fullPictureStreamAuthenticated:false}};
 const pixelFd=fs.openSync(path.join(pixelDir,'pixels.bin'),'r'),emphFd=fs.openSync(path.join(pixelDir,'emph.bin'),'r'),pixelsHash=createHash('sha256'),emphasisHash=createHash('sha256');
 try{for(let from=0;from<limit;from+=batch){
  const count=Math.min(batch,limit-from),pix=Buffer.alloc(count*240*224),emph=Buffer.alloc(count*224);
  if(fs.readSync(pixelFd,pix,0,pix.length,from*240*224)!==pix.length||fs.readSync(emphFd,emph,0,emph.length,from*224)!==emph.length)throw Error('Native picture truncated');pixelsHash.update(pix);emphasisHash.update(emph);
  const rows=await page.evaluate(({pixels,emphasis,pads,names,original}:any)=>{
   const w=window as any,a=w.audit,pix=Uint8Array.from(atob(pixels),(c:string)=>c.charCodeAt(0)),emph=Uint8Array.from(atob(emphasis),(c:string)=>c.charCodeAt(0)),rows=[];a.pictures=[];
   for(let f=0;f<pads.length;f++){
    a.ctx.drawImage(document.querySelector('#game'),-8,-8);const remake=a.ctx.getImageData(0,0,240,224).data;
    for(let y=0;y<224;y++)for(let x=0;x<240;x++){const k=y*240+x,index=pix[f*240*224+k],c=a.rgb[index|emph[f*224+y]<<6],j=k*4;if(!c)throw Error('Unknown emphasis');a.native[j]=c[0];a.native[j+1]=c[1];a.native[j+2]=c[2];a.native[j+3]=255;const packed=remake[j]<<16|remake[j+1]<<8|remake[j+2],mapped=a.palette[index]===packed?a.rgb[index]:a.mapping.get(packed);if(mapped){remake[j]=mapped[0];remake[j+1]=mapped[1];remake[j+2]=mapped[2];}}
    const picture=a.compareFrame(a.native,remake,240,224,a.policy,a.work);a.pictures.push(remake);
    w.mario.step(names.filter((_:any,b:number)=>pads[f]&(1<<b)),1);
    rows.push({picture,liveState:original?undefined:a.capture(w.marioDebug.simulation),phase:w.marioDebug.simulation.phase});
   }return rows;
  },{pixels:pix.toString('base64'),emphasis:emph.toString('base64'),pads:Array.from(pads.subarray(from,from+count)),names,original});
  for(let i=0;i<count;i++){
   const f=from+i,raw=ram.subarray(f*2048,(f+1)*2048),actual=rows[i],live=liveAudit?.compare(raw,actual.liveState),observed=observations[f];
   if(live){if(!live.gaps.length)liveCoverage.fullyComparedFrames++;else if(live.checked.length)liveCoverage.partiallyComparedFrames++;else liveCoverage.uncheckedFrames++;if(live.status==='mismatch')liveCoverage.knownMismatchFrames++;for(const gap of live.gaps){const g=liveCoverage.gaps[gap]??={first:f,count:0};g.count++;}}
   const state=original?(observed?.status??'unchecked'):(live?.status??'unchecked'),picture=actual.picture.status==='pass'?'match':'mismatch';span(out.spans,f,levelAt(raw),state,picture);out.directlyComparedFrames++;if(f+1===warmup)steadyStarted=performance.now();
   if(!out.firstFailure&&(state==='mismatch'||picture==='mismatch')){
    const remake=Buffer.from(await page.evaluate((i:number)=>{const b=(window as any).audit.pictures[i];let s='';for(let j=0;j<b.length;j+=32768)s+=String.fromCharCode(...b.subarray(j,j+32768));return btoa(s);},i),'base64'),native=Buffer.alloc(240*224*4);
    for(let k=0;k<240*224;k++){const c=rgb[pix[i*240*224+k]|emph[i*224+Math.floor(k/240)]<<6];native[k*4]=c[0];native[k*4+1]=c[1];native[k*4+2]=c[2];native[k*4+3]=255;}
    out.firstFailure={frame:f,level:levelAt(raw),state,fields:observed?.fields??live?.differences.map(d=>d.field)??[],picture:actual.picture,nativeMode:raw[0x770],nativeTask:raw[0x772],remakePhase:actual.phase,nativeFrameSha256:sha(native),remakeFrameSha256:sha(remake)};
    if(original||input.id===inventory[0].id){const png=new PNG({width:480,height:224});for(let y=0;y<224;y++){native.copy(png.data,y*480*4,y*240*4,(y+1)*240*4);remake.copy(png.data,(y*480+240)*4,y*240*4,(y+1)*240*4);}const filename=input.id.replace(':','-')+'.png';fs.mkdirSync(path.join(path.dirname(a.out!),'evidence'),{recursive:true});fs.writeFileSync(path.join(path.dirname(a.out!),'evidence',filename),PNG.sync.write(png));out.firstFailure.image=filename;}
   }
  }
 }
 out.timing={totalRunSeconds:(performance.now()-auditStarted)/1000,warmupFrames:Math.min(warmup,limit),steadyFrames:Math.max(0,limit-warmup),steadySeconds:steadyStarted===undefined?null:(performance.now()-steadyStarted)/1000};
 out.provenance.observedPixelStreamSha256=pixelsHash.digest('hex');out.provenance.observedEmphasisStreamSha256=emphasisHash.digest('hex');
 if(limit===pads.length){if(out.provenance.observedPixelStreamSha256!==meta.pixelsSha256||out.provenance.observedEmphasisStreamSha256!==meta.emphasisSha256)throw Error('Native streamed picture/emphasis hash mismatch');out.provenance.fullPictureStreamAuthenticated=true;}
 // Bounded pilots are deliberately not valid completed-cohort receipts.
 for(let f=limit;f<pads.length;f++)span(out.spans,f,levelAt(ram.subarray(f*2048,(f+1)*2048)),'unchecked','unchecked');return out;
 }finally{fs.closeSync(pixelFd);fs.closeSync(emphFd);}
}
try{
 await Promise.all(Array.from({length:Math.min(Number(a.jobs),selected.length)},async()=>{const page=await browser.newPage();await page.goto(`http://127.0.0.1:${a.port}/`);await page.waitForFunction(()=>(window as any).mario?.ready,null,{timeout:90000});while(cursor<selected.length){const input=selected[cursor++];report.progress.active.push(input.id);checkpoint();try{const result=await audit(input,page);report.runs.push(result);console.log(JSON.stringify({id:input.id,first:result.firstFailure?.frame??null,checked:result.directlyComparedFrames,done:report.runs.length,total:selected.length}));}catch(error){report.errors.push({id:input.id,error:String(error)});console.error(input.id,String(error));}finally{report.progress.active=report.progress.active.filter((id:string)=>id!==input.id);checkpoint();}}await page.close();}));
 for(const [relative,digest]of Object.entries(sourceHashes))if(sha(fs.readFileSync(path.join(root,relative)))!==digest)throw Error('Audit source changed '+relative);
 execFileSync('git',['diff','--exit-code',runtimeCommit,'--','games/smb/src','games/smb/data'],{stdio:'pipe'});
 if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==runtimeCommit)throw Error('Runtime pin changed');
 report.progress.status=report.errors.length?'incomplete':pilot!==undefined?'pilot-complete':selected.length===inventory.length?'complete':'shard-complete';report.progress.finished=new Date().toISOString();checkpoint();
}finally{await browser.close();await server.close();}if(report.errors.length)process.exitCode=1;

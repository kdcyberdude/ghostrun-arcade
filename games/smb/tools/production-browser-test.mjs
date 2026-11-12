/** Production UI/keyboard check: no development bridge or simulation state. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preview} from 'vite';
import {chromium} from 'playwright';
import {findCompleteOpaquePlayer} from './optional-entry-player.mjs';
import {PNG} from 'pngjs';
const folder='evidence/local/production-browser-'+new Date().toISOString().replaceAll(':','-');fs.mkdirSync(folder,{recursive:true});
const port=Number(process.env.PRODUCTION_PORT??5197);
const server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/mario-playwright/chromium-1148/chrome-linux/chrome',args:['--no-sandbox','--use-angle=swiftshader']});
const page=await browser.newPage(),errors=[],requests=[],captures=[];
// Observe the real Web Audio graph; native decoding, playback and output stay active.
await page.addInitScript(()=>{
 const probe=window.audioProbe={contexts:[],analysers:[],gains:[],starts:[]};
 const gain=AudioContext.prototype.createGain,source=AudioContext.prototype.createBufferSource;
 AudioContext.prototype.createGain=function(...args){const node=gain.apply(this,args),analyser=this.createAnalyser();analyser.fftSize=2048;node.connect(analyser);probe.contexts.push(this);probe.analysers.push(analyser);probe.gains.push(node);return node;};
 AudioContext.prototype.createBufferSource=function(...args){const node=source.apply(this,args),start=node.start;node.start=function(...parameters){probe.starts.push({time:this.context.currentTime,offset:parameters[1]??0,loop:this.loop,loopStart:this.loopStart,loopEnd:this.loopEnd,bufferDuration:this.buffer?.duration});return start.apply(this,parameters);};return node;};
});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{requests.push(r.url());if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const raf=frames=>page.evaluate(frames=>new Promise(resolve=>{function next(){if(--frames<=0)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}),frames);
const audio=[];
async function audioSample(name){const sample=await page.evaluate(()=>{const p=window.audioProbe,a=p.analysers.at(-1),wave=new Float32Array(a?.fftSize??2048);a?.getFloatTimeDomainData(wave);return {contexts:p.contexts.map(c=>c.state),currentTime:p.contexts.at(-1)?.currentTime,gains:p.gains.map(g=>g.gain.value),rms:Math.sqrt(wave.reduce((sum,x)=>sum+x*x,0)/wave.length),starts:p.starts.slice()};});audio.push({name,...sample});return sample;}
async function capture(name){const data=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png')),bytes=Buffer.from(data.split(',')[1],'base64'),file=`${folder}/${name}.png`;fs.writeFileSync(file,bytes);const row={name,file,sha256:createHash('sha256').update(bytes).digest('hex'),player:findCompleteOpaquePlayer(PNG.sync.read(bytes))};captures.push(row);return row;}
try{
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>document.querySelector('#start')&&!document.querySelector('#start').disabled);await raf(12);
 assert.equal(await page.evaluate(()=>Boolean(window.mario||window.marioDebug)),false,'Development bridges leaked into production');
 const title=await capture('title');await page.click('#start');await raf(200);const start=await capture('started');
 assert.ok(start.player&&Math.abs(start.player.originX-40)<=1&&start.player.feetY===208);
 const music=await audioSample('started');assert.ok(music.contexts.includes('running'),'User gesture must activate native AudioContext');assert.ok(music.rms>0.00001,'Decoded supplied music must produce a nonzero signal');assert.ok(music.starts.some(s=>s.loop&&s.loopEnd>s.loopStart&&s.loopEnd<=s.bufferDuration));
 await page.keyboard.down('ArrowRight');await raf(50);const walked=await capture('walked');assert.ok(walked.player&&walked.player.originX>start.player.originX+20);
 await page.keyboard.down('KeyZ');await raf(20);const jumped=await capture('jumped');assert.ok(jumped.player&&jumped.player.feetY<190);
 const jumpedAudio=await audioSample('jumped');assert.ok(jumpedAudio.starts.some(s=>!s.loop),'An ordinary jump must start an actual effect voice');
 await page.keyboard.up('KeyZ');await page.keyboard.up('ArrowRight');await page.click('#pause');const paused=await capture('paused');await raf(30);const stillPaused=await capture('paused-later');assert.equal(paused.sha256,stillPaused.sha256);
 await page.waitForFunction(()=>{const p=window.audioProbe,s=p.starts.at(-1);return s&&!s.loop&&p.contexts.at(-1).currentTime>s.time+s.bufferDuration+0.05;},undefined,{timeout:5000});
 assert.ok((await audioSample('paused-after-command')).rms<0.000001,'Music must stop during pause after its short pause cue');
 await page.click('#mute');await page.click('#pause');await raf(35);await capture('resumed');
 assert.ok((await audioSample('muted-resumed')).rms<0.000001,'Muted playback must remain silent');
 await page.click('#mute');
 await page.waitForFunction(()=>{const p=window.audioProbe,wave=new Float32Array(p.analysers.at(-1).fftSize);p.analysers.at(-1).getFloatTimeDomainData(wave);return wave.some(x=>Math.abs(x)>0.00001);},undefined,{timeout:3000});
 assert.ok((await audioSample('unmuted')).gains.some(g=>g>0),'Unmuting must restore native output gain and a nonzero note within the phrase');
 await page.keyboard.press('Escape');await page.click('#restart');await raf(2);const restarted=await capture('restarted');assert.equal(restarted.sha256,title.sha256);
 assert.equal(await page.evaluate(()=>Boolean(window.mario||window.marioDebug)),false);assert.deepEqual(errors,[]);
 assert.ok(requests.every(url=>!url.includes('/model/')&&!url.endsWith('.nes')&&!url.includes('policy-player')));
 const files=fs.readdirSync('dist/assets').filter(f=>/\.(js|css)$/.test(f));
 const buildHashes=Object.fromEntries(['dist/index.html',...files.map(f=>'dist/assets/'+f)].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
 fs.writeFileSync('evidence/production-browser.json',JSON.stringify({date:new Date().toISOString(),buildHashes,scope:'Actual production preview, DOM buttons and real keyboard controls. No controller/debug bridge is present or used. A parallel analyser observes the real native Web Audio output, without replacing decoding/playback. This does not establish subjective listening or original-reference audio equivalence, and is not a campaign win.',checks:['startup/assets','no development bridge','title/start','real keyboard walk/jump','pause freezes bitmap','actual audio activation/decoding/loop','actual jump effect','pause cue then silence','mute silence/unmute signal','restart title','no model/ROM/policy network dependency'],errors,requests,captures,audio},null,2)+'\n');
 console.log(JSON.stringify({passed:true,captures:captures.length,errors,independentProductionUI:true}));
}catch(error){fs.writeFileSync(`${folder}/failure.json`,JSON.stringify({date:new Date().toISOString(),error:String(error),errors,captures,audio},null,2)+'\n');throw error;}
finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}

/** Focused cold-start browser/Node state parity for the retained load-alias prefixes.
 * npx tsx games/smb/tools/harness/native-player-hole-browser-proof.ts --captures DIR --ids SHA,SHA --out FILE
 * No native state is injected; no pixels or dashboard completion are claimed. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {parseArgs} from 'node:util';import {createHash} from 'node:crypto';import {createServer} from 'vite';import {chromium} from 'playwright';
import fixture from '../../tests/fixtures/native-player-hole.json';import {replayState,stateSpans} from './native-w1-continuous-catalog.js';import {compareLiveWorld1Start,LiveWorld1StateAudit} from './native-continuous-state.js';
const {values:a}=parseArgs({options:{captures:{type:'string'},ids:{type:'string'},out:{type:'string'},port:{type:'string',default:'54777'}}});if(!a.captures||!a.ids||!a.out)throw Error('--captures --ids --out required');
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),root=path.resolve('games/smb'),server=await createServer({root,server:{host:'127.0.0.1',port:Number(a.port),strictPort:true,hmr:false,watch:null},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),runs=[];
try{
 for(const id of a.ids.split(',')){
  const run=fixture.runs.find(r=>r.id==='mood:'+id);assert.ok(run,'retained alias case');const dir=path.join(a.captures,id),pads=Buffer.from(run.pads,'base64'),ram=fs.readFileSync(path.join(dir,'ram.bin')),initial=fs.readFileSync(path.join(dir,'initial.ram'));assert.equal(hash(ram),run.sourceRamSha256);assert.equal(hash(initial),run.initialSha256);assert.equal(hash(pads),run.inputSha256);
  const node=replayState(pads,ram,initial),page=await browser.newPage();await page.goto(`http://127.0.0.1:${a.port}/`);await page.waitForFunction(()=>(window as any).mario?.ready,null,{timeout:90000});
  const start=await page.evaluate(async()=>{const w=window as any;document.querySelector('canvas')!.toDataURL=()=>'';w.mario.reset({playing:false});w.aliasCapture=(await import(String('/tools/harness/native-continuous-state.ts'))).captureLiveWorld1State;return w.aliasCapture(w.marioDebug.simulation,true);});
  assert.deepEqual(compareLiveWorld1Start(initial,start),node.coverage.start);const audit=new LiveWorld1StateAudit(),spans:{from:number;to:number;state:string}[]=[];
  for(let from=0;from<pads.length;from+=64){
   const states=await page.evaluate(pads=>{const w=window as any,names=['a','b','select','start','up','down','left','right'];return pads.map((pad:number)=>{w.mario.step(names.filter((_,b)=>pad&(1<<b)),1);return w.aliasCapture(w.marioDebug.simulation);});},Array.from(pads.subarray(from,from+64)));
   for(const [index,state]of states.entries()){const frame=from+index,result=audit.compare(ram.subarray(frame*2048,(frame+1)*2048),state);spans.push({from:frame,to:frame+1,state:result.status});}
  }
  const observed=stateSpans(spans);assert.deepEqual(observed,node.spans,'all browser/Node state classifications');assert.equal(node.firsts['load.scrollLocked'],undefined);assert.equal(node.firsts['load.parserColumn'],undefined);runs.push({id,frames:pads.length,initialSha256:run.initialSha256,inputSha256:run.inputSha256,sourceRamSha256:run.sourceRamSha256,stateSpans:observed,exactNodeBrowserParity:true});await page.close();
 }
}finally{await browser.close();await server.close();}
fs.writeFileSync(a.out,JSON.stringify({role:'Focused continuous state-only browser/Node proof; no model reseeds, pixels or dashboard completion claim',runs},null,1)+'\n');console.log(runs.map(r=>[r.id,r.frames,'PASS']));

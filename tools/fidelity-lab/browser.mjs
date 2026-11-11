import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {gameBuildBinding} from '../game-build-binding.mjs';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function sourceBinding(root){
 const files={};
 async function walk(directory){for(const entry of await fs.readdir(path.join(root,directory),{withFileTypes:true})){const name=path.join(directory,entry.name);if(entry.isDirectory())await walk(name);else if(entry.isFile())files[name]=hash(await fs.readFile(path.join(root,name)));}}
 await walk('src');await walk('data');
 for(const name of ['package.json','package-lock.json','index.html'])files[name]=hash(await fs.readFile(path.join(root,name)));
 return files;
}
// Vite's inlined source map describes the actual transformed response, which
// can be stale even when files on disk and an unrelated cache hash look current.
export function verifyServedTypeScript(code,source,name){
 const match=code.match(/sourceMappingURL=data:application\/json[^,]*;base64,([^\s]+)/);
 assert.ok(match,`Missing inline source map for served ${name}`);
 const map=JSON.parse(Buffer.from(match[1],'base64').toString('utf8'));
 assert.ok(map.sourcesContent?.length===1,`Unexpected source map for served ${name}`);
 assert.equal(map.sourcesContent[0],source,`Stale served TypeScript module: ${name}`);
 return {sourceSha256:hash(source),servedSha256:hash(code)};
}
export function verifyServedData(actual,source,name){
 assert.equal(actual,JSON.stringify(JSON.parse(source)),`Stale served data module: ${name}`);
}
export function watchServedModules(page,url){
 const served=[];
 page.on('response',response=>{
  const target=new URL(response.url());
  if(target.origin===new URL(url).origin&&((target.pathname.startsWith('/src/')&&target.pathname.endsWith('.ts'))||(target.pathname.startsWith('/data/')&&target.pathname.endsWith('.json'))))
   served.push({url:response.url(),name:target.pathname.slice(1),body:response.text()});
 });
 return served;
}
export async function verifyServedModules(page,served){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 assert.ok(served.some(x=>x.name==='src/simulation.ts'),'Production simulation module was not observed');
 assert.ok(served.some(x=>x.name==='data/levels.json'),'Production level data module was not observed');
 const data=served.filter(x=>x.name.startsWith('data/'));
 const actualData=await page.evaluate(async urls=>Promise.all(urls.map(async url=>JSON.stringify((await import(url)).default))),data.map(x=>x.url));
 const modules={};
 for(const item of served){
  const source=await fs.readFile(path.join(root,item.name),'utf8'),code=await item.body;
  if(item.name.startsWith('src/'))modules[item.name]=verifyServedTypeScript(code,source,item.name);
  else {verifyServedData(actualData[data.indexOf(item)],source,item.name);modules[item.name]={sourceSha256:hash(source),servedSha256:hash(code)};}
 }
 return modules;
}
export async function openBrowser(url,executablePath,journal){
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-webgl']});
 const errors=[];let changed=false,index=0;
 try{
  const page=await browser.newPage({viewport:{width:1024,height:900}});
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
  const served=watchServedModules(page,url);
  page.on('websocket',socket=>socket.on('framereceived',event=>{try{if(['update','full-reload'].includes(JSON.parse(String(event.payload)).type))changed=true;}catch{}}));
  await page.goto(url);await page.waitForFunction(()=>window.mario?.ready,null,{timeout:30000});
  const binding=await gameBuildBinding(page);
  binding.servedModules=await verifyServedModules(page,served);
  async function control(request,group){
   assert.ok(['reset','step','observe'].includes(request.op),'Only ordinary public controllers are allowed');
   assert.equal(changed,false,'Development sources changed during capture');
   const reply=await page.evaluate(request=>request.op==='reset'?window.mario.reset({playing:request.playing??true}):request.op==='step'?window.mario.step(request.buttons,request.frames,request.buttons2):window.mario.observe(),request);
   const {image,...receipt}=reply;assert.ok(typeof image==='string'&&image.startsWith('data:image/png;base64,'),'Expected production 256x240 PNG');
   const bytes=Buffer.from(image.split(',')[1],'base64'),controllerIndex=index++;
   await journal.write(JSON.stringify({controllerIndex,timestampUtc:new Date().toISOString(),case:group,request,response:{...receipt,imageSha256:hash(bytes)}})+'\n');
   return {...receipt,bytes,controllerIndex};
  }
  return {browser,control,errors,binding,changed:()=>changed};
 }catch(error){await browser.close();throw error;}
}

// Shared browser harness for the 2.5D visual experiment: private-port Vite server (never touches other servers), real-GPU headless Chrome, route playback.
import {chromium,type Browser,type Page} from 'playwright';
import {createServer,type ViteDevServer} from 'vite';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {routeFrames} from './route.js';
import type {Button} from '../../src/types.js';
export const CHROME=process.env.CHROMIUM_PATH??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome');
export const BACKENDS:Record<string,string[]>={
 metal:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist'],
 gpu:['--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist'],
 vulkan:['--use-angle=vulkan','--enable-features=Vulkan','--ignore-gpu-blocklist','--disable-vulkan-surface'],
 webgpu:['--use-angle=vulkan','--enable-features=Vulkan','--enable-unsafe-webgpu','--ignore-gpu-blocklist','--disable-vulkan-surface'],
 'gpu-unlocked':['--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-vsync','--disable-frame-rate-limit'],
 soft:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],
};
export interface Game{page:Page;browser:Browser;server:ViteDevServer;errors:string[];renderer:string;close():Promise<void>}
export async function openGame(o:{view?:string;backend?:string;port?:number;viewport?:{width:number;height:number};query?:string}={}):Promise<Game>{
 const port=o.port??Number(process.env.V25_PORT??5473);
 const server=await createServer({server:{port,strictPort:true,host:'127.0.0.1'},logLevel:'error'});await server.listen();
 const browser=await chromium.launch({executablePath:CHROME,headless:true,args:['--no-sandbox','--enable-webgl',...BACKENDS[o.backend??'gpu']]});
 const page=await browser.newPage({viewport:o.viewport??{width:1100,height:1000}});const errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${port}/?view=${o.view??'orig'}${o.query?'&'+o.query:''}`);
 try{await page.waitForFunction(()=>(window as any).mario?.ready,undefined,{timeout:90000});}catch(e){console.error('page never became ready; page errors:',errors);await browser.close();await server.close();throw e;}
 const renderer=await page.evaluate(()=>{const g=document.createElement('canvas').getContext('webgl2');const e=g?.getExtension('WEBGL_debug_renderer_info');return e?String(g!.getParameter(e.UNMASKED_RENDERER_WEBGL)):'unknown';});
 return {page,browser,server,errors,renderer,async close(){await browser.close();await server.close();}};
}
export async function savePng(dataUrl:string,file:string){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,Buffer.from(dataUrl.split(',')[1],'base64'));}
/** Run-length groups of the route (buttons, count) so a browser step call advances many identical frames. */
export function routeRuns(limit=Infinity):{buttons:Button[];frames:number}[]{
 const runs:{buttons:Button[];frames:number}[]=[];let n=0;
 for(const b of routeFrames()){if(n++>=limit)break;const last=runs[runs.length-1];if(last&&last.buttons.join()===b.join())last.frames++;else runs.push({buttons:b,frames:1});}
 return runs;
}
/** Advance the browser simulation along the route to an absolute frame (1 call per run, draws once per call). */
export async function playTo(page:Page,runs:{buttons:Button[];frames:number}[],state:{run:number;into:number;frame:number},target:number){
 while(state.frame<target&&state.run<runs.length){
  const r=runs[state.run],n=Math.min(r.frames-state.into,target-state.frame);
  await page.evaluate(([b,f])=>(window as any).mario.step(b,f),[r.buttons,n] as [Button[],number]);
  state.frame+=n;state.into+=n;if(state.into>=r.frames){state.run++;state.into=0;}
 }
}

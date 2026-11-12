#!/usr/bin/env node
// Exact saved eval controller replay. Reads trainer outputs; all writes stay under evidence/local/model-play.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export function trainerPadToMask(pad){
 return [4,5,6,7,0,1,3,2].reduce((mask,bit,i)=>mask|((pad>>bit&1)<<i),0);
}

async function main(){
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {values:args}=parseArgs({allowPositionals:true,options:{eval:{type:'string'},mood:{type:'string',default:'0'},frames:{type:'string'},shots:{type:'string'}}});
const evalRoot='/home/kd/Desktop/proj/llm_gameplay/runs/rl/smb-20261110c-moods/eval';
let source=args.eval;
if(!source||source==='latest'){
 const candidates=(await fs.readdir(evalRoot)).filter(n=>/^it\d+$/.test(n)).sort().reverse();
 for(const n of candidates)try{await fs.access(path.join(evalRoot,n,'summary.json'));source=path.join(evalRoot,n);break;}catch{}
}
assert.ok(source,'No completed eval found');source=path.resolve(source);
const mood=Number(args.mood);assert.ok(Number.isInteger(mood)&&mood>=0&&mood<8,'--mood must be 0..7');
const output=path.join(root,'evidence/local/model-play',path.basename(source));await fs.mkdir(output,{recursive:true});
async function retain(name){
 const bytes=await fs.readFile(path.join(source,name)),dest=path.join(output,name);
 try{await fs.writeFile(dest,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;assert.ok(bytes.equals(await fs.readFile(dest)),`Saved input changed: ${name}`);}
 return bytes;
}
const summary=JSON.parse(await retain('summary.json')),pads=await retain(`smb_mood${mood}.pads.bin`);
const expected=summary.find(r=>r.game==='smb'&&r.mood===mood);assert.ok(expected,'Missing mood summary');
// Trainer bits A,B,select,start,up,down,left,right -> native-trace up,down,left,right,A,B,start,select.
const actions=[];
for(const pad of pads){const mask=trainerPadToMask(pad),last=actions.at(-1);if(last?.[0]===mask)last[1]++;else actions.push([mask,1]);}
const stem=path.join(output,`mood${mood}`),actionsPath=stem+'-actions.json',trace=stem+'-ppu-native.jsonl';
await fs.writeFile(actionsPath,JSON.stringify({start:'power_on',source:path.join(output,`smb_mood${mood}.pads.bin`),actions})+'\n');
async function run(command,argv,capture=false){
 return await new Promise((resolve,reject)=>{const child=spawn(command,argv,{cwd:root,stdio:['ignore',capture?'pipe':'inherit','inherit'],env:{...process.env,NEAREST:'1'}}),chunks=[];
 if(capture)child.stdout.on('data',b=>chunks.push(b));child.on('error',reject);child.on('close',code=>code===0?resolve(Buffer.concat(chunks).toString()):reject(new Error(`${command} exited ${code}`)));});
}
const shots=(args.shots??'').split(',').filter(Boolean).map(Number);assert.ok(shots.every(f=>Number.isInteger(f)&&f>=0&&f<pads.length),'Shot outside stream');
let exists=true;try{await fs.access(trace);}catch{exists=false;}
const shotDir=stem+'-shots';let missingShot=false;
for(const frame of shots)try{await fs.access(path.join(shotDir,`f${frame}-native.png`));}catch{missingShot=true;}
if(!exists||missingShot){
 // Never overwrite retained native rows; a shot run also verifies exact trace reproduction.
 const dest=exists?stem+`-shots-${Date.now()}.jsonl`:trace;
 await run('node',['tools/fidelity-lab/native-trace.mjs','--actions',actionsPath,'--out',dest,'--start','power_on','--clock','ppu','--ram','15-19,22-26,30-34,110-114,135-139,207-211,1876-1877',...(shots.length?['--shots',shots.join(','),'--shots-dir',stem+'-shots']:[])]);
 if(exists)assert.ok((await fs.readFile(trace)).equals(await fs.readFile(dest)),'Shot replay changed native trace');
}
const rows=(await fs.readFile(trace,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(rows.length,pads.length,'Incomplete trace; preserve it for diagnosis and remove manually before retry');
const control=r=>r.mode===1&&r.task===3&&r.engine===8;
const first=rows.findIndex(control);assert.ok(first>=0,'Reference never reached play');
let deaths=0,maxLevel=0;const deathFrames=[];
for(let i=first;i<rows.length;i++){
 const r=rows[i];if(r.mode===1)maxLevel=Math.max(maxLevel,(r.world-1)*4+r.stage-1);
 if(r.engine===6&&rows[i-1]?.engine!==6&&r.mode===1){deaths++;deathFrames.push(i);}
}
const sanity={eval:source,mood,frames:rows.length,firstControl:first,expected:{level:expected.level,deaths:expected.deaths,end:expected.end},observed:{level:maxLevel,deaths,deathFrames},pass:maxLevel===expected.level&&deaths===expected.deaths};
await fs.writeFile(stem+'-sanity.json',JSON.stringify(sanity,null,2)+'\n');console.log(JSON.stringify(sanity));
assert.ok(sanity.pass,'Reference replay does not reproduce eval summary; STOP before comparing the remake');
const comparison=await run('npx',['tsx','tools/campaign-compare.ts',trace,`--actions=${actionsPath}`,'--from=1-1','--to=8-4','--threshold=3','--events=100000',...(args.frames?[`--frames=${args.frames}`]:[])],true);
await fs.writeFile(stem+'-compare.txt',comparison);console.log(comparison.split('\n').filter(l=>!/^\s+f\d/.test(l)).slice(0,45).join('\n'));
const classes=await run('node',['tools/harness/cause-classes.mjs',stem+'-compare.txt',`--trace=${trace}`],true);await fs.writeFile(stem+'-classes.txt',classes);console.log(classes);
if(shots.length){
 const {openBrowser}=await import('../fidelity-lab/browser.mjs'),{compareImages}=await import('../fidelity-lab/report.mjs');
 const server=spawn('npx',['vite','--port','5397','--strictPort','--host','127.0.0.1'],{cwd:root,stdio:'ignore',detached:true});
 let driver;const journal=await fs.open(stem+'-shots/controllers.jsonl','w');
 try{
  for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:5397')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const chrome=process.env.CHROMIUM_PATH??'/opt/google/chrome/chrome';driver=await openBrowser('http://127.0.0.1:5397',chrome,journal);await driver.control({op:'reset',playing:false},'model');
  const keys=['up','down','left','right','a','b','start','select'];let f=0,skip=0;const metrics=[];
  for(const [mask,count]of actions){const dropped=Math.min(skip,count);skip-=dropped;let left=count-dropped;while(left){const target=shots.filter(s=>s>=f).sort((a,b)=>a-b)[0],n=Math.min(left,240,target===undefined?240:target-f+1);const reply=await driver.control({op:'step',buttons:keys.filter((_,b)=>mask&(1<<b)),frames:n},'model');f+=n;left-=n;
   if(shots.includes(f-1)){const base=path.join(stem+'-shots',`f${f-1}`);await fs.writeFile(base+'-remake.png',reply.bytes);metrics.push({frame:f-1,origin:'power_on/title, exact elapsed pad frames; no phase offset or playable-origin seed',regions:await compareImages(base+'-native.png',base+'-remake.png',base+'-pair.png',[{name:'full',x:0,y:0,width:256,height:240}],{differentPixelFraction:0.01,meanAbsoluteChannelError:2})});}
  }if(f>Math.max(...shots))break;}
  assert.deepEqual(driver.errors,[]);await fs.writeFile(stem+'-shots/metrics.json',JSON.stringify(metrics,null,2)+'\n');
 }finally{if(driver)await driver.browser.close();await journal.close();process.kill(-server.pid,'SIGTERM');}
}

}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

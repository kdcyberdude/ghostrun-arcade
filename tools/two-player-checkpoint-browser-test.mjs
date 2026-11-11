/** Real title-to-midpoint two-player handoff using ordinary controller inputs. */
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {gameBuildBinding} from './game-build-binding.mjs';
const out=process.env.TWO_PLAYER_CHECKPOINT_OUTPUT??`evidence/local/two-player-checkpoint-browser-${new Date().toISOString().replaceAll(':','-')}`;fs.mkdirSync(out,{recursive:false});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/google-chrome-stable',args:['--no-sandbox','--use-angle=swiftshader']});const page=await browser.newPage(),errors=[],records=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
try{
 await page.goto(process.env.GAME_URL??'http://127.0.0.1:5463/');await page.waitForFunction(()=>window.mario?.ready);const binding=await gameBuildBinding(page);
 const snapshot=()=>page.evaluate(()=>window.marioDebug.snapshot());
 async function step(buttons,frames,buttons2=[],title=false){const r=await page.evaluate(({buttons,frames,buttons2})=>window.mario.step(buttons,frames,buttons2),{buttons,frames,buttons2});assert.equal(r.framesAdvanced,title?0:frames);return r;}
 async function save(label){const r=await page.evaluate(()=>window.mario.observe()),bytes=Buffer.from(r.image.split(',')[1],'base64'),state=await snapshot();const file=`${out}/${label}.png`;fs.writeFileSync(file,bytes);records.push({label,frame:r.frame,status:await page.locator('#status').innerText(),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),image:file,state});return state;}
 await page.evaluate(()=>window.mario.reset({playing:false}));await step(['select'],1,[],true);await step([],1,[],true);await step(['start'],1,[],true);await step([],171);/* the title intro lasts 171 frames since the native-timed lives screen (tests/life-flow.test.ts, control row 215); the old wait was 169 */const start=await save('mario-start');assert.equal(start.phase,'play');assert.equal(start.camera,0);
 const actions=JSON.parse(fs.readFileSync('data/observed-winning-inputs.json')).actions,names=['up','down','left','right','a','b'];
 for(const [mask,frames] of actions.slice(0,77))await step(names.filter((_,i)=>mask&(1<<i)),frames);
 for(let i=77;i<81;i++)await step(['left','b'],actions[i][1]);await save('mario-midpoint-fall');
 await step([],20);assert.equal((await snapshot()).phase,'dying','Mario must fall naturally');await step([],456);
 const luigi=await save('luigi-opening');assert.equal(luigi.phase,'play');assert.match(await page.locator('#status').innerText(),/^Luigi · 3 lives/);assert.equal(luigi.camera,0);assert.equal(luigi.player.x,40);
 await step([],200,['right','b']);const luigiDeath=await save('luigi-death');assert.equal(luigiDeath.phase,'dying','Luigi must die from ordinary enemy contact');
 await step([],400);const returned=await save('mario-checkpoint-return');assert.equal(returned.phase,'play');assert.match(await page.locator('#status').innerText(),/^Mario · 2 lives/);assert.equal(returned.camera,1280);assert.equal(returned.player.x,1320);
 assert.deepEqual(errors,[]);const report={scope:'Actual browser title selection and ordinary two-controller inputs including Mario midpoint fall and Luigi enemy death. Read-only debug snapshots assert state; no position, lives, checkpoint or level writes. This is a local reproduction, not full-frame native parity.',binding,errors,records};fs.writeFileSync(process.env.TWO_PLAYER_CHECKPOINT_REPORT??'evidence/two-player-checkpoint-browser-current.json',JSON.stringify(report,null,2)+'\n');console.log('Real browser midpoint handoff passed.');
}finally{await browser.close();}

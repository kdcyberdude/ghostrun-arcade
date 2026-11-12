/** Interface regression checks. GAME_URL points at a running dev or production game; VIEW=3d selects 3D. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const view=process.env.VIEW??'2d',base=process.env.GAME_URL??'http://127.0.0.1:53943/';
const url=new URL(base);if(view==='3d')url.searchParams.set('view','3d');
const out=process.env.INTERFACE_OUTPUT??`evidence/local/interface-${view}`;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),args:['--no-sandbox','--enable-webgl','--use-gl=angle',...(process.platform==='darwin'?['--use-angle=metal']:['--use-angle=gl-egl']),'--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],checks=[],requests=[];
await page.addInitScript(()=>{const create=AudioContext.prototype.createGain;AudioContext.prototype.createGain=function(...args){const gain=create.apply(this,args),analyser=this.createAnalyser();gain.connect(analyser);window.interfaceAudio={context:this,analyser};return gain;};});
await page.addInitScript(()=>{window.interfaceDrawCalls=0;for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const original=WebGL2RenderingContext.prototype[name];WebGL2RenderingContext.prototype[name]=function(...args){window.interfaceDrawCalls++;return original.apply(this,args);};}});
page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
async function ready(){await page.waitForFunction(()=>document.body.classList.contains('ready'),undefined,{timeout:90000});}
try{
 const loadingPage=await browser.newPage({viewport:{width:1440,height:960}});let release;
 const held=new Promise(resolve=>release=resolve);
 await loadingPage.route(view==='3d'?'**/assets3d/models/*.glb':'**/assets/graphics/player-mario-right.png',async route=>{await held;await route.continue();});
 await loadingPage.goto(url.href,{waitUntil:'domcontentloaded'});
 await loadingPage.waitForFunction(()=>{const p=document.querySelector('#load-progress');return p.value>0&&p.value<p.max;},undefined,{timeout:30000});
 assert.equal(await loadingPage.locator('#start').isDisabled(),true);await loadingPage.screenshot({path:out+'/loading-desktop.png'});release();
 await loadingPage.waitForFunction(()=>document.body.classList.contains('ready'),undefined,{timeout:90000});await loadingPage.close();checks.push('real asset progress before Play becomes available');
 const failed=await browser.newPage();const modulePattern=/\/(src\/main\.ts|assets\/main-[^/]+\.js)/;
 await failed.route(modulePattern,r=>r.abort());await failed.goto(url.href);await failed.waitForFunction(()=>document.body.classList.contains('load-error'));
 assert.equal(await failed.locator('#retry').isVisible(),true);await failed.unroute(modulePattern);await failed.locator('#retry').click();await failed.waitForFunction(()=>document.body.classList.contains('ready'),undefined,{timeout:90000});
 if(view==='3d'){
  await failed.route(modulePattern,r=>r.abort());await failed.reload();await failed.waitForFunction(()=>document.body.classList.contains('load-error'));await failed.unroute(modulePattern);
  await failed.locator('.version[data-view="2d"]').click();await failed.waitForURL(u=>!u.searchParams.has('view'));await failed.waitForFunction(()=>document.body.classList.contains('ready'),undefined,{timeout:90000});
  assert.equal(await failed.locator('body').getAttribute('data-view'),'2d');checks.push('2D remains reachable after a failed 3D download');
 }
 await failed.close();checks.push('failed download and retry recovery');
 await page.goto(url.href);await ready();assert.equal(await page.locator('#start').isEnabled(),true);assert.equal(await page.locator('#loading').isVisible(),false);
 const calls=await page.evaluate(()=>window.interfaceDrawCalls);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.interfaceDrawCalls),calls,'Home should not keep rendering the hidden game');checks.push('no hidden gameplay rendering on home');
 await page.screenshot({path:`${out}/home-desktop.png`});checks.push('loaded assets and desktop home');
 await page.locator('#controls-open').click();assert.equal(await page.locator('#settings').isVisible(),true);
 await page.locator('[data-action=a]').click();await page.keyboard.press('KeyO');assert.match(await page.locator('#binding-message').innerText(),/already assigned/);
 await page.keyboard.press('KeyC');assert.equal(await page.locator('[data-action=a]').innerText(),'C');
 await page.screenshot({path:`${out}/controls-desktop.png`});
 await page.locator('#settings-close').click();await page.reload();await ready();await page.locator('#controls-open').click();assert.equal(await page.locator('[data-action=a]').innerText(),'C');checks.push('remap, conflict detection and persistence');
 await page.locator('[data-action=a]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#settings').isVisible(),true);assert.equal(await page.locator('[data-action=a]').innerText(),'C');
 await page.locator('[data-player="1"]').click();await page.locator('[data-action=a]').click();await page.keyboard.press('KeyV');assert.equal(await page.locator('[data-action=a]').innerText(),'V');
 await page.locator('#display-tab').click();await page.locator('#players').selectOption('2');
 if(view==='3d'){
  assert.equal(await page.locator('#res').inputValue(),'auto');
  for(const [preset,height] of [['2K',1440],['4K',2160],['0.5K',480],['1K',960]]){await page.locator('#res').selectOption(preset);assert.equal(await page.locator('#game').evaluate(c=>c.height),height);}
  await page.locator('#res').selectOption('auto');assert.ok([480,960,1440,2160].includes(await page.locator('#game').evaluate(c=>c.height)));assert.equal(new URL(page.url()).searchParams.has('res'),false);
  checks.push('Auto default and live 4K/2K/1K/0.5K resolution changes');
  assert.equal(await page.locator('#quality').inputValue(),'high');await page.locator('#quality').selectOption('low');assert.equal(await page.locator('#launch-quality').inputValue(),'low');assert.equal(new URL(page.url()).searchParams.get('quality'),'low');await page.locator('#quality').selectOption('ultra');await page.locator('#quality').selectOption('high');
  checks.push('live High/Low graphics changes');
 }
 await page.screenshot({path:`${out}/display-desktop.png`});
 await page.locator('#controls-tab').click();await page.locator('#reset-controls').click();assert.equal(await page.locator('[data-action=a]').innerText(),'U');await page.locator('[data-player="0"]').click();
 await page.locator('#settings-close').click();await page.locator('#start').click();await page.waitForFunction(()=>document.body.classList.contains('playing'));
 const fullscreen=await page.evaluate(()=>Boolean(document.fullscreenElement));assert.equal(fullscreen,true,'Play requests fullscreen from the user gesture');checks.push('fullscreen launch');
 await page.locator('#home-button').click();await page.waitForFunction(()=>!document.body.classList.contains('playing'));assert.equal(await page.locator('#lobby').isVisible(),true);await page.locator('#start').click();await page.waitForFunction(()=>document.body.classList.contains('playing'));checks.push('Home button returns to the home screen');
 const dev=await page.evaluate(()=>Boolean(window.marioDebug));
 if(process.env.PRODUCTION==='1'){assert.equal(dev,false);assert.equal(await page.evaluate(()=>Boolean(window.mario)),false);checks.push('production excludes development control bridge');}
 if(dev){
  await page.waitForFunction(()=>window.marioDebug.snapshot().phase==='play',undefined,{timeout:15000});
  assert.equal(await page.evaluate(()=>window.marioDebug.simulation.twoPlayer),true);
  const x=await page.evaluate(()=>window.marioDebug.snapshot().player.x);await page.keyboard.down('ArrowRight');await page.waitForFunction(x=>window.marioDebug.snapshot().player.x>x+12,x);await page.keyboard.up('ArrowRight');
  await page.keyboard.down('Space');await page.waitForFunction(()=>window.marioDebug.snapshot().player.y<170);await page.keyboard.up('Space');checks.push('real movement, jump and two-player selection');
 }else await page.waitForFunction(()=>/^(Mario|Luigi) · \d+ lives · World /.test(document.querySelector('#status').textContent),undefined,{timeout:20000});
 await page.waitForFunction(()=>{const a=window.interfaceAudio;if(a?.context.state!=='running')return false;const wave=new Float32Array(a.analyser.fftSize);a.analyser.getFloatTimeDomainData(wave);return wave.some(v=>Math.abs(v)>0.00001);});checks.push('actual game audio decodes and produces sound');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#settings').isVisible(),true);
 if(dev){const frame=await page.evaluate(()=>window.marioDebug.snapshot().frame);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.marioDebug.snapshot().frame),frame);}
 await page.locator('#resume').click();assert.equal(await page.locator('#settings').isVisible(),false);checks.push('menu pauses and resumes');
 await page.keyboard.press('KeyP');assert.match(await page.locator('#pause').innerText(),/Resume/);await page.locator('#mute').click();assert.equal(await page.locator('#mute').getAttribute('aria-pressed'),'true');await page.locator('#pause').click();checks.push('pause and sound');
 await page.screenshot({path:`${out}/playing-desktop.png`});
 await page.keyboard.press('Escape');await page.locator('#restart').click();assert.equal(await page.locator('#lobby').isVisible(),true);
 if(await page.evaluate(()=>Boolean(document.fullscreenElement)))await page.evaluate(()=>document.exitFullscreen());
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/home-mobile.png`});
 await page.locator('#controls-open').click();assert.ok((await page.locator('#settings').boundingBox()).width<=390);await page.screenshot({path:`${out}/controls-mobile.png`});await page.locator('#settings-close').click();
 await page.locator('#start').click();const bounds=await page.locator('#game').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=391);assert.ok(Math.abs(bounds.width/bounds.height-256/240)<.01);checks.push('mobile fit and original aspect ratio');
 const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const touchPage=await touchContext.newPage();
 await touchPage.goto(url.href);await touchPage.waitForFunction(()=>document.body.classList.contains('ready'),undefined,{timeout:90000});await touchPage.locator('#start').tap();
 assert.equal(await touchPage.locator('#touch').isVisible(),true);for(const button of await touchPage.locator('#touch button').all()){const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44);}
 if(dev){await touchPage.waitForFunction(()=>window.marioDebug?.snapshot().phase==='play');const x=await touchPage.evaluate(()=>window.marioDebug.snapshot().player.x);const b=await touchPage.locator('[data-button=right]').boundingBox();await touchPage.mouse.move(b.x+b.width/2,b.y+b.height/2);await touchPage.mouse.down();await touchPage.waitForFunction(x=>window.marioDebug.snapshot().player.x>x+10,x);await touchPage.mouse.up();}
 await touchPage.screenshot({path:out+'/playing-touch-portrait.png'});await touchPage.setViewportSize({width:844,height:390});const gameBox=await touchPage.locator('#game').boundingBox(),toolbarBox=await touchPage.locator('#playbar').boundingBox();assert.ok(toolbarBox.x>=gameBox.x+gameBox.width,'Landscape toolbar stays in the side border');await touchPage.screenshot({path:out+'/playing-touch-landscape.png'});await touchContext.close();checks.push(dev?'coarse-pointer touch controls, movement and 44px targets':'coarse-pointer touch controls and 44px targets');
 assert.deepEqual(requests.filter(u=>/\.(nes|pt|pth|onnx|safetensors)(?:[?#]|$)|\/(roms|model)\//i.test(u)),[]);checks.push('no ROM or policy-model requests');
 assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/result.json`,JSON.stringify({view,url:url.href,checks,errors,fullscreen},null,2));console.log(JSON.stringify({passed:true,view,checks,errors,out}));
}finally{await browser.close();}

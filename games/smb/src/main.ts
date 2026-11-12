import {Simulation,NATIVE_HZ} from './simulation.js';
import {GameRenderer} from './renderer.js';
import {observedLevels} from './levels.js';
import {AudioEngine} from './audio.js';
import type {Button} from './types.js';
import {GameShell} from './shell.js';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const status=document.querySelector<HTMLParagraphElement>('#status')!;
const is3D=new URLSearchParams(location.search).get('view')==='3d';
document.body.dataset.view=is3D?'3d':'2d';
const sim=new Simulation(observedLevels());const view=is3D?new (await import('./render3d/index.js')).Renderer3D(canvas):new GameRenderer(canvas);const audio=new AudioEngine();
const heldKeys=new Set<string>();const heldPointers=new Map<number,Button>();
// Presses since the last game frame, so a tap shorter than one drawn frame still reaches the game.
const tappedKeys=new Set<string>();const tappedPointers=new Set<Button>();let controlled=false;let muted=false;let loaded=false;
const shell=new GameShell({pause:setPaused,isPaused:()=>sim.paused,clear:clearInput,restart:()=>{sim.reset();soundEvents();draw();},focus:()=>canvas.focus()});
const keyMaps=shell.maps;
const heights:Record<string,number>={'4K':2160,'2K':1440,'1K':960,'0.5K':480};
const LADDER=['4K','2K','1K','0.5K'],TIERS=['ultra','high','low'] as const;type Tier=typeof TIERS[number];
const RES_OPTIONS='<option value="auto">Auto · fits your screen and device</option><option value="4K">4K · 2304 × 2160</option><option value="2K">2K · 1536 × 1440</option><option value="1K">1K · 1024 × 960</option><option value="0.5K">0.5K · 512 × 480</option>';
const TIER_OPTIONS='<option value="ultra">Ultra · for strong graphics chips</option><option value="high">High · shadows and glow</option><option value="low">Low · fastest</option>';
let autoRes=false,currentRes='1K',autoSettle=0;
/** Auto starts at the largest preset the screen can show in fullscreen (physical pixels); the speed watch then steps it down if frames drop. */
function screenPreset(){const physical=Math.min(screen.width*240/256,screen.height)*(devicePixelRatio||1);return LADDER.find(p=>heights[p]<=physical*1.1)??'0.5K';}
// What Auto settled on last time in this browser, so the next visit starts there instead of re-learning (cleared by choosing Auto again).
const LEARNED='smb-auto-3d';
function learned():{res?:string;quality?:Tier}{try{return JSON.parse(localStorage.getItem(LEARNED)??'{}');}catch{return {};}}
function learn(){try{localStorage.setItem(LEARNED,JSON.stringify({res:currentRes,quality:tier()}));}catch{}}
function autoStart(){const saved=learned().res,fits=screenPreset();return saved&&LADDER.indexOf(saved)>LADDER.indexOf(fits)?saved:fits;}
const tier=():Tier=>(document.querySelector<HTMLSelectElement>('#quality')?.value??'high') as Tier;
if('setResolution' in view){
 document.querySelector('.edition')!.textContent='3D VERSION';
 document.querySelector('.preview-edition')!.textContent='3D VERSION';
 const preview=document.querySelector<HTMLImageElement>('.preview-image img')!;preview.src=import.meta.env.BASE_URL+'assets3d/preview.png';preview.alt='Mario in the recreated 3D World 1-1, with trees, hills and flowers';
 document.querySelector('#launch-resolution')!.removeAttribute('hidden');
 document.querySelector('#graphics-settings')!.innerHTML=`<div class="setting-row"><div><h3>3D resolution</h3><p>Auto picks the sharpest size your screen can show<br>and lowers it if your device can’t keep up.</p></div><select id="res" aria-label="3D resolution">${RES_OPTIONS}</select></div><div class="setting-row"><div><h3>Graphics</h3><p>Ultra adds soft ambient shading and extra smoothing.<br>Low is the fastest.</p></div><select id="quality" aria-label="3D graphics quality">${TIER_OPTIONS}</select></div>`;
 document.querySelector('#launch-res')!.innerHTML=RES_OPTIONS;document.querySelector('#launch-quality')!.innerHTML=TIER_OPTIONS;
 const params=new URLSearchParams(location.search),legacy:Record<string,string>={'960p':'1K','1080p':'1K'},asked=legacy[params.get('res')??'']??params.get('res')??'auto';
 for(const picker of document.querySelectorAll<HTMLSelectElement>('#launch-res,#res'))picker.addEventListener('change',()=>setResolution(picker.value));
 const asked3=params.get('quality');
 for(const picker of document.querySelectorAll<HTMLSelectElement>('#launch-quality,#quality')){picker.value=TIERS.includes(asked3 as Tier)?asked3!:!params.has('res')&&TIERS.includes(learned().quality as Tier)?learned().quality!:'high';picker.addEventListener('change',()=>setQuality(picker.value as Tier));}
 view.setQuality(tier());
 // An explicit ?scale= (tools, old links) keeps its exact size and leaves Auto off.
 if(params.has('scale')&&!params.has('res')){currentRes=LADDER.find(p=>heights[p]<=view.scale*240)??'0.5K';for(const p of document.querySelectorAll<HTMLSelectElement>('#launch-res,#res'))p.value=currentRes;}
 else setResolution(asked in heights?asked:'auto',false);
}
function remember(key:string,value:string|null){const url=new URL(location.href);if(value===null)url.searchParams.delete(key);else url.searchParams.set(key,value);history.replaceState(null,'',url);}
/** 'auto' or a preset. Manual choices switch Auto off until Auto is picked again. */
function setResolution(choice:string,save=true){if(!('setResolution' in view))return;autoRes=choice==='auto';if(autoRes&&save)try{localStorage.removeItem(LEARNED);}catch{}currentRes=autoRes?autoStart():choice;view.setResolution(heights[currentRes]);for(const p of document.querySelectorAll<HTMLSelectElement>('#launch-res,#res'))p.value=choice;if(save)remember('res',autoRes?null:choice);autoSettle=2;if(loaded)draw();}
function setQuality(quality:Tier){if(!('setQuality' in view))return;view.setQuality(quality);for(const p of document.querySelectorAll<HTMLSelectElement>('#launch-quality,#quality'))p.value=quality;remember('quality',quality);autoSettle=2;if(loaded)draw();}
/** Auto: Ultra drops to High first. Otherwise jump straight to the largest preset whose estimated frame time fits 60 fps: a fixed ~4 ms
 * (scene, shadows, game) plus a part that scales with pixel count (measured on an M4 laptop: 4K costs ~3.5x 1K, not 5x). Below 0.5K, use Low graphics. */
function adaptResolution(fps:number){
 if(!('setResolution' in view))return false;
 const t=tier();if(t==='ultra'){setQuality('high');learn();return true;}
 const fixed=4,budget=1000/60*0.85,now=1000/fps,h=heights[currentRes],i=LADDER.indexOf(currentRes);
 const estimate=(p:string)=>fixed+Math.max(0,now-fixed)*(heights[p]/h)**2;
 let next=LADDER.find(p=>heights[p]<h&&estimate(p)<=budget)??'0.5K';if(LADDER.indexOf(next)<=i)next=LADDER[Math.min(i+1,LADDER.length-1)];
 if(next!==currentRes){currentRes=next;view.setResolution(heights[next]);autoSettle=2;learn();return true;}
 if(t!=='low'){setQuality('low');learn();return true;}
 return false;
}
function clearInput(){heldKeys.clear();heldPointers.clear();tappedKeys.clear();tappedPointers.clear();}
function setPaused(paused:boolean){sim.paused=paused;audio.setPaused(paused);if(loaded)draw();}
function heldButtons(player:number){
 const keys=Array.from(new Set([...heldKeys,...tappedKeys]),key=>keyMaps[player][key]).filter((button):button is Button=>button!==undefined);
 const active=sim.phase==='title'||!sim.twoPlayer?0:sim.currentPlayer;
 return [...new Set([...keys,...(player===active?[...heldPointers.values(),...tappedPointers]:[])])];
}
const eventAliases:Record<string,string>={silence:'command_silence',sfx_jump_small:'sfx_small_jump',sfx_jump_big:'sfx_big_jump',sfx_swim:'sfx_swim_stomp',sfx_stomp:'sfx_swim_stomp',sfx_pipe:'sfx_pipe_down_injury',sfx_powerup:'sfx_powerup_collected',sfx_kick:'sfx_enemy_smack',sfx_1up:'sfx_extra_life'};
function soundEvents(){for(const raw of sim.events.splice(0)){const id=eventAliases[raw]??raw;if(id==='command_silence')audio.stopMusic();else if(id.startsWith('music_'))audio.playMusic(id);else if(id!=='pause'&&id!=='unpause')audio.effect(id);}audio.setPaused(sim.paused);}
function draw(){if(sim.phase!=='title'&&!shell.playing)shell.enterGame();view.render(sim);status.textContent=sim.paused?'Paused · P or Enter to resume':sim.phase==='title'?'Enter to start · Tab selects 1 or 2 players':sim.phase==='intro'?`World ${sim.level.id} · Get ready`:sim.phase==='gameover'?'Game over · Enter to return to title':`${sim.currentPlayer?'Luigi':'Mario'} · ${sim.lives} lives · World ${sim.level.id}`;const pauseButton=document.querySelector('#pause')!;pauseButton.textContent=sim.paused?'Resume · P':'Pause · P';pauseButton.setAttribute('aria-pressed',String(sim.paused));}
function resize(){const scale=Math.min(innerWidth/256,innerHeight/240);canvas.style.width=256*scale+'px';canvas.style.height=240*scale+'px';}
function pause(){if(sim.phase==='play'||sim.phase==='flag'){setPaused(!sim.paused);shell.wake();}}
function mute(){muted=!muted;audio.setMuted(muted);document.querySelector('#mute')!.textContent=muted?'Muted · M':'Sound on · M';document.querySelector('#mute')!.setAttribute('aria-pressed',String(muted));}
async function activate(){try{await audio.unlock();}catch{shell.notify('Sound couldn’t start. You can keep playing and try sound again.');}if(!shell.blocking)canvas.focus();}
function start(){
 if(document.body.classList.contains('loading'))return;
 shell.requestFullscreen();shell.enterGame();
 if(sim.phase==='title'){sim.twoPlayer=document.querySelector<HTMLSelectElement>('#players')!.value==='2';sim.paused=false;}
 if(sim.phase==='title'||sim.phase==='play'||sim.phase==='flag'||sim.phase==='gameover'||sim.phase==='ending'){sim.step(['start']);sim.step([]);}
 void activate();soundEvents();draw();
}
addEventListener('keydown',event=>{
 if(shell.blocking||document.body.classList.contains('loading'))return;
 const target=event.target as HTMLElement;
 if(target.matches('button,select,input,a')&&['Enter','Space','Tab'].includes(event.code))return;
 const mapped=keyMaps.some(map=>event.code in map);
 if(mapped||['KeyP','KeyM','KeyF'].includes(event.code))event.preventDefault();
 if(event.repeat)return;
 if(event.code==='KeyF'){void shell.fullscreen();return;}
 if(event.code==='KeyP'){pause();return;}
 if(event.code==='KeyM'){mute();void activate();return;}
 if(!mapped)return;
 if(!shell.playing){if(keyMaps[0][event.code]==='start'||keyMaps[1][event.code]==='start')start();return;}
 void activate();heldKeys.add(event.code);tappedKeys.add(event.code);
});
addEventListener('keyup',event=>heldKeys.delete(event.code));
addEventListener('blur',()=>{clearInput();if(sim.phase==='play'&&!controlled){setPaused(true);shell.wake();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(shell.playing&&!controlled)setPaused(true);}});
document.querySelector('#start')!.addEventListener('click',start);
document.querySelector('#pause')!.addEventListener('click',pause);document.querySelector('#mute')!.addEventListener('click',()=>{mute();void activate();});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-button]')){
 button.addEventListener('pointerdown',event=>{event.preventDefault();if(shell.blocking)return;button.setPointerCapture(event.pointerId);heldPointers.set(event.pointerId,button.dataset.button as Button);tappedPointers.add(button.dataset.button as Button);void activate();});
 for(const event of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,event=>heldPointers.delete((event as PointerEvent).pointerId));
}
await view.load();loaded=true;resize();addEventListener('resize',resize);draw();
// Development controllers receive rendered pixels and exact advancement accounting.
// Privileged state is deliberately on a separate object, unavailable in production builds.
if(import.meta.env.DEV){
 const bridge={reset(options:{playing?:boolean;twoPlayer?:boolean}={}){controlled=true;if(options.playing===false)shell.home();else shell.enterGame();clearInput();sim.twoPlayer=options.twoPlayer??false;sim.reset(options.playing??true);soundEvents();draw();return {frame:sim.frame,framesAdvanced:0,image:view.screenshot()};},
  step(buttons:Button[],frames:number,buttons2:Button[]=[]){controlled=true;const before=sim.frame;sim.step(buttons,frames,buttons2);soundEvents();draw();return {frame:sim.frame,framesRequested:frames,framesAdvanced:sim.frame-before,image:view.screenshot()};},
  observe(){draw();return {frame:sim.frame,framesAdvanced:0,image:view.screenshot()};},
  resume(){controlled=false;last=performance.now();accumulator=0;},pause(){controlled=true;},ready:true};
 Object.assign(window,{mario:bridge,marioDebug:{snapshot:()=>({frame:sim.frame,phase:sim.phase,level:sim.level.id,area:sim.area.id,player:{...sim.player},camera:sim.camera,lives:sim.lives,score:sim.score,time:sim.time,coins:sim.coins,enemies:sim.enemies.map(e=>({...e})),audioErrors:audio.errors}),simulation:sim}});
}
// Slow-device notice. The game shows every frame, so when the GPU draws fewer than 60 a second the whole game slows down; say why and offer a lighter setting.
const perf=document.querySelector<HTMLElement>('#perf')!,perfText=document.querySelector<HTMLElement>('#perf-text')!,perfLower=document.querySelector<HTMLButtonElement>('#perf-lower')!;
let perfFrames=0,perfStart=0,perfSlow=0,perfDismissed=false;
// Frame-rate counter: on by default, saved per browser. When the game runs below full speed it turns amber and offers the next lighter setting.
const fpsBox=document.querySelector<HTMLElement>('#fps')!,fpsText=document.querySelector<HTMLElement>('#fps-text')!,fpsLower=document.querySelector<HTMLButtonElement>('#fps-lower')!,fpsToggle=document.querySelector<HTMLSelectElement>('#fps-toggle')!;
let showFps=true;try{showFps=localStorage.getItem('smb-show-fps')!=='off';}catch{}
fpsToggle.value=showFps?'on':'off';
fpsToggle.addEventListener('change',()=>{showFps=fpsToggle.value==='on';try{localStorage.setItem('smb-show-fps',fpsToggle.value);}catch{}if(!showFps)fpsBox.hidden=true;});
function showRate(fps:number){
 if(!showFps)return;const slow=fps<50,speed=Math.round(Math.min(fps,NATIVE_HZ)/NATIVE_HZ*100),lighter=slow?lighterSetting():undefined;
 const detail='setResolution' in view?` · ${currentRes}${autoRes?' auto':''}`:'';
 fpsText.textContent=slow?`${Math.round(fps)} FPS · ${speed}% speed`:`${Math.round(fps)} FPS${detail}`;fpsBox.classList.toggle('slow',slow);
 fpsLower.hidden=!lighter;if(lighter){fpsLower.textContent=lighter.label;fpsLower.onclick=()=>{lighter.apply();perf.hidden=true;perfSlow=0;canvas.focus();};}
 fpsBox.hidden=false;
}
const playTwoD={label:'Switch to 2D',apply:()=>{const url=new URL(location.href);url.searchParams.delete('view');location.assign(url);}};
/** The next lighter manual setting; with Auto on, only offered once Auto has nothing lighter left. */
function lighterSetting():{label:string;apply:()=>void}|undefined{
 if(!('setResolution' in view))return undefined;
 const t=tier(),i=LADDER.indexOf(currentRes);
 if(autoRes)return currentRes==='0.5K'&&t==='low'?playTwoD:undefined;
 if(t!=='low')return {label:'Lower graphics',apply:()=>setQuality(TIERS[TIERS.indexOf(t)+1])};
 if(i<LADDER.length-1)return {label:'Lower resolution',apply:()=>setResolution(LADDER[i+1])};
 return playTwoD;
}
function watchSpeed(now:number){
 if(!shell.playing||sim.paused||shell.blocking||controlled||document.hidden){perfStart=0;return;}
 if(!perfStart){perfStart=now;perfFrames=0;return;}
 perfFrames++;const span=now-perfStart;if(span<1000)return;
 const fps=perfFrames*1000/span;perfStart=now;perfFrames=0;perfSlow=fps<54?perfSlow+1:0;
 // Two slow seconds in a row (one hiccup is ignored); the first two seconds after any change are skipped while shaders warm up.
 if(autoSettle>0)autoSettle--;else if(autoRes&&perfSlow>=2&&adaptResolution(fps))perfSlow=0;
 showRate(fps);
 const lighter=lighterSetting();
 if(perfSlow<3||!perf.hidden||perfDismissed||(autoRes&&!lighter))return;
 const speed=Math.round(Math.min(fps,NATIVE_HZ)/NATIVE_HZ*100);
 perfText.innerHTML=`<b>The game is running at ${speed}% speed.</b> Your device is drawing ${Math.round(fps)} frames a second and the game needs 60. Every frame is still played, so the game slows down instead of skipping ahead. ${lighter?'A lighter setting should help.':'Closing other tabs or apps may help.'}`;
 perfLower.hidden=!lighter;if(lighter){perfLower.textContent=lighter.label;perfLower.onclick=()=>{lighter.apply();perf.hidden=true;perfSlow=0;canvas.focus();};}
 perf.hidden=false;
}
document.querySelector('#perf-dismiss')!.addEventListener('click',()=>{perf.hidden=true;perfDismissed=true;canvas.focus();});
document.querySelector('#home-button')!.addEventListener('click',()=>{clearInput();sim.reset();soundEvents();draw();perf.hidden=true;fpsBox.hidden=true;shell.home();});
let last=performance.now(),accumulator=0;
// At most one game frame per drawn frame: if drawing falls below the native rate, the whole game (timer included) slows in proportion instead of skipping frames.
function animate(now:number){watchSpeed(now);if(!controlled&&!shell.blocking){accumulator+=Math.min(250,now-last);const dt=1000/NATIVE_HZ;if(accumulator>=dt){sim.step(heldButtons(0),1,heldButtons(1));tappedKeys.clear();tappedPointers.clear();accumulator=Math.min(accumulator-dt,dt);}soundEvents();if(shell.playing)draw();}last=now;requestAnimationFrame(animate);}
requestAnimationFrame(animate);

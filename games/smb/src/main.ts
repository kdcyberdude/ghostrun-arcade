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
const LADDER=['4K','2K','1K','0.5K'],TIERS=['ultra','high','low'] as const;type Tier=typeof TIERS[number];type Level={res:string;tier:Tier};
const RES_OPTIONS='<option value="auto">Auto · adjusts to your device</option><option value="4K">4K · 2304 × 2160</option><option value="2K">2K · 1536 × 1440</option><option value="1K">1K · 1024 × 960</option><option value="0.5K">0.5K · 512 × 480</option>';
const TIER_OPTIONS='<option value="auto">Auto · adjusts to your device</option><option value="ultra">Ultra · for strong graphics chips</option><option value="high">High · shadows and glow</option><option value="low">Low · fastest</option>';
// Auto walks one ladder of resolution and graphics together, cheapest first. Ultra only at the top, where a strong GPU has room for it.
const ALL_LEVELS:Level[]=[{res:'0.5K',tier:'low'},{res:'0.5K',tier:'high'},{res:'1K',tier:'low'},{res:'1K',tier:'high'},{res:'2K',tier:'high'},{res:'4K',tier:'high'},{res:'2K',tier:'ultra'},{res:'4K',tier:'ultra'}];
/** Estimated frame time in ms on an Apple M4 laptop (measured): fixed scene cost plus a part per million pixels. Only ratios matter; a measured factor rescales it per device. */
const COST={low:[5.8,1.5],high:[4,4.5],ultra:[4,15]} as const;
const cost=(l:Level)=>{const h=heights[l.res],mp=h*h*256/240/1e6;return COST[l.tier][0]+COST[l.tier][1]*mp;};
let autoRes=false,autoTier=false,current:Level={res:'1K',tier:'high'},autoSettle=0,deviceFactor=1,fastWindows=0;
let probe:{back:Level;windows:number}|undefined;const blocked=new Map<string,number>(),failures=new Map<string,number>();
/** Leave a level alone after it fails: 2 minutes, then 4, 8… so a device at its limit is not retried often. */
function block(l:Level,now:number){const n=(failures.get(key(l))??0)+1;failures.set(key(l),n);blocked.set(key(l),now+120000*2**(n-1));}const key=(l:Level)=>l.res+'/'+l.tier;
/** The largest preset the screen can show in fullscreen, in physical pixels. */
function screenPreset(){const physical=Math.min(screen.width*240/256,screen.height)*(devicePixelRatio||1);return LADDER.find(p=>heights[p]<=physical*1.1)??'0.5K';}
/** Levels Auto may use: within the screen, and holding fixed whichever of resolution or graphics was chosen by hand. */
function ladder(){const max=heights[screenPreset()];return ALL_LEVELS.filter(l=>heights[l.res]<=max&&(autoRes||l.res===current.res)&&(autoTier||l.tier===current.tier));}
// What Auto settled on last time in this browser, so the next visit starts there (cleared by choosing Auto again).
const LEARNED='smb-auto-3d';
function learned():Partial<Level>{try{return JSON.parse(localStorage.getItem(LEARNED)??'{}');}catch{return {};}}
function learn(){try{localStorage.setItem(LEARNED,JSON.stringify(current));}catch{}}
const tier=():Tier=>current.tier;
if('setResolution' in view){
 document.querySelector('.edition')!.textContent='3D VERSION';
 document.querySelector('.preview-edition')!.textContent='3D VERSION';
 const preview=document.querySelector<HTMLImageElement>('.preview-image img')!;preview.src=import.meta.env.BASE_URL+'assets3d/preview.png';preview.alt='Mario in the recreated 3D World 1-1, with trees, hills and flowers';
 document.querySelector('#launch-resolution')!.removeAttribute('hidden');
 document.querySelector('#graphics-settings')!.innerHTML=`<div class="setting-row"><div><h3>3D resolution</h3><p>Auto raises or lowers resolution and graphics<br>to keep the game smooth on your device.</p></div><select id="res" aria-label="3D resolution">${RES_OPTIONS}</select></div><div class="setting-row"><div><h3>Graphics</h3><p>Ultra adds soft ambient shading and extra smoothing.<br>Low is the fastest.</p></div><select id="quality" aria-label="3D graphics quality">${TIER_OPTIONS}</select></div>`;
 document.querySelector('#launch-res')!.innerHTML=RES_OPTIONS;document.querySelector('#launch-quality')!.innerHTML=TIER_OPTIONS;
 const params=new URLSearchParams(location.search),legacy:Record<string,string>={'960p':'1K','1080p':'1K'};
 const askedRes=legacy[params.get('res')??'']??params.get('res')??'',askedTier=params.get('quality')??'';
 autoRes=!(askedRes in heights);autoTier=!TIERS.includes(askedTier as Tier);
 // An explicit ?scale= (tools, old links) keeps its exact size and leaves Auto off.
 const fixedScale=params.has('scale')&&!params.has('res');if(fixedScale)autoRes=autoTier=false;
 current={res:fixedScale?LADDER.find(p=>heights[p]<=view.scale*240)??'0.5K':autoRes?'1K':askedRes,tier:autoTier?'high':askedTier as Tier};
 if(autoRes||autoTier){
  const levels=ladder(),saved=learned(),fitsDefault=[...levels].reverse().find(l=>cost(l)<=20)??levels[0];  // start where a typical laptop GPU holds 50+ fps
  current=levels.find(l=>l.res===saved.res&&l.tier===saved.tier)??fitsDefault;
 }
 for(const picker of document.querySelectorAll<HTMLSelectElement>('#launch-res,#res'))picker.addEventListener('change',()=>setResolution(picker.value));
 for(const picker of document.querySelectorAll<HTMLSelectElement>('#launch-quality,#quality'))picker.addEventListener('change',()=>setQuality(picker.value as Tier|'auto'));
 if(!fixedScale)apply(current);else view.setQuality(current.tier);
 syncPickers();
}
function remember(key:string,value:string|null){const url=new URL(location.href);if(value===null)url.searchParams.delete(key);else url.searchParams.set(key,value);history.replaceState(null,'',url);}
function syncPickers(){for(const p of document.querySelectorAll<HTMLSelectElement>('#launch-res,#res'))p.value=autoRes?'auto':current.res;for(const p of document.querySelectorAll<HTMLSelectElement>('#launch-quality,#quality'))p.value=autoTier?'auto':current.tier;}
function apply(level:Level){if(!('setResolution' in view))return;current=level;view.setResolution(heights[level.res]);view.setQuality(level.tier);autoSettle=2;fastWindows=0;if(loaded)draw();}
/** 'auto' or a preset. Choosing Auto again forgets what Auto learned before. */
function setResolution(choice:string,save=true){if(!('setResolution' in view))return;autoRes=choice==='auto';if(autoRes){try{localStorage.removeItem(LEARNED);}catch{}blocked.clear();failures.clear();}else apply({...current,res:choice});syncPickers();if(save)remember('res',autoRes?null:choice);}
function setQuality(choice:Tier|'auto'){if(!('setQuality' in view))return;autoTier=choice==='auto';if(autoTier){try{localStorage.removeItem(LEARNED);}catch{}blocked.clear();failures.clear();}else apply({...current,tier:choice as Tier});syncPickers();remember('quality',autoTier?null:choice);}
/**
 * Auto, once per measured second. The loop already skips frames down to 30 drawn frames a second, so the game keeps full speed above 30 fps.
 * Down: two seconds under 30 fps jumps straight to the richest level estimated to hold 45 fps (estimates are rescaled by this device's measured cost).
 * Up: six seconds at a steady ~60 fps tries one level richer (a steady 60 says nothing about spare capacity, so it has to be tried); if that drops below 45 fps it goes back and leaves that level alone (2, 4, 8… minutes).
 */
function adapt(fps:number,slowWindows:number,now:number){
 if(!('setResolution' in view)||!(autoRes||autoTier))return false;
 if(fps<57)deviceFactor=(1000/fps)/cost(current);
 const levels=ladder(),i=levels.findIndex(l=>key(l)===key(current));
 if(probe){probe.windows--;if(fps<45){block(current,now);const back=probe.back;probe=undefined;apply(back);learn();return true;}if(probe.windows<=0)probe=undefined;}
 if(slowWindows>=2&&i>0){
  block(current,now);
  const target=[...levels.slice(0,i)].reverse().find(l=>cost(l)*deviceFactor<=1000/45)??levels[0];apply(target);learn();return true;
 }
 fastWindows=fps>=57?fastWindows+1:0;
 const next=levels[i+1];
 if(fastWindows>=6&&next&&(blocked.get(key(next))??0)<now){probe={back:current,windows:4};apply(next);learn();return true;}
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
/** With frame skipping the game keeps full speed down to 30 drawn frames a second. */
const gameSpeed=(fps:number)=>Math.round(Math.min(fps*2,NATIVE_HZ)/NATIVE_HZ*100);
function showRate(fps:number){
 if(!showFps)return;const slow=fps<30,lighter=slow?lighterSetting():undefined;
 const detail='setResolution' in view?` · ${current.res} ${current.tier}${autoRes||autoTier?' · auto':''}`:'';
 fpsText.textContent=slow?`${Math.round(fps)} FPS · ${gameSpeed(fps)}% speed`:`${Math.round(fps)} FPS${detail}`;fpsBox.classList.toggle('slow',slow);
 fpsLower.hidden=!lighter;if(lighter){fpsLower.textContent=lighter.label;fpsLower.onclick=()=>{lighter.apply();perf.hidden=true;perfSlow=0;canvas.focus();};}
 fpsBox.hidden=false;
}
const playTwoD={label:'Switch to 2D',apply:()=>{const url=new URL(location.href);url.searchParams.delete('view');location.assign(url);}};
/** A lighter setting to offer by hand: none while Auto still has a lower level; otherwise the next manual step, then 2D. */
function lighterSetting():{label:string;apply:()=>void}|undefined{
 if(!('setResolution' in view))return undefined;
 if((autoRes||autoTier)&&ladder().findIndex(l=>key(l)===key(current))>0)return undefined;
 if(!autoTier&&current.tier!=='low')return {label:'Lower graphics',apply:()=>setQuality(TIERS[TIERS.indexOf(current.tier)+1])};
 const i=LADDER.indexOf(current.res);if(!autoRes&&i<LADDER.length-1)return {label:'Lower resolution',apply:()=>setResolution(LADDER[i+1])};
 return playTwoD;
}
function watchSpeed(now:number){
 if(!shell.playing||sim.paused||shell.blocking||controlled||document.hidden){perfStart=0;return;}
 if(!perfStart){perfStart=now;perfFrames=0;return;}
 perfFrames++;const span=now-perfStart;if(span<1000)return;
 const fps=perfFrames*1000/span;perfStart=now;perfFrames=0;perfSlow=fps<30?perfSlow+1:0;
 // The first two seconds after any change are skipped while shaders and buffers warm up.
 if(autoSettle>0)autoSettle--;else if(adapt(fps,perfSlow,now))perfSlow=0;
 showRate(fps);
 const lighter=perfSlow>=3?lighterSetting():undefined;
 if(!lighter||!perf.hidden||perfDismissed)return;
 perfText.innerHTML=`<b>The game is running at ${gameSpeed(fps)}% speed.</b> Your device is drawing ${Math.round(fps)} frames a second; the game needs at least 30 to keep full speed. A lighter setting should help.`;
 perfLower.textContent=lighter.label;perfLower.hidden=false;perfLower.onclick=()=>{lighter.apply();perf.hidden=true;perfSlow=0;canvas.focus();};
 perf.hidden=false;
}
document.querySelector('#perf-dismiss')!.addEventListener('click',()=>{perf.hidden=true;perfDismissed=true;canvas.focus();});
document.querySelector('#home-button')!.addEventListener('click',()=>{clearInput();sim.reset();soundEvents();draw();perf.hidden=true;fpsBox.hidden=true;shell.home();});
let last=performance.now(),accumulator=0;
// Up to two game frames per drawn frame: full game speed down to 30 drawn frames a second; below that the whole game (timer included) slows in proportion rather than skipping more.
const MAX_STEPS_PER_DRAW=2;
function animate(now:number){watchSpeed(now);if(!controlled&&!shell.blocking){accumulator+=Math.min(250,now-last);const dt=1000/NATIVE_HZ;for(let steps=0;accumulator>=dt&&steps<MAX_STEPS_PER_DRAW;steps++){sim.step(heldButtons(0),1,heldButtons(1));tappedKeys.clear();tappedPointers.clear();accumulator-=dt;}accumulator=Math.min(accumulator,dt);soundEvents();if(shell.playing)draw();}last=now;requestAnimationFrame(animate);}
requestAnimationFrame(animate);

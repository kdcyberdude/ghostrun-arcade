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
const heights:Record<string,number>={'1K':960,'2K':1440,'4K':2160};
if('setResolution' in view){
 document.querySelector('.edition')!.textContent='3D VERSION';
 document.querySelector('.preview-edition')!.textContent='3D VERSION';
 const preview=document.querySelector<HTMLImageElement>('.preview-image img')!;preview.src=import.meta.env.BASE_URL+'assets3d/preview.png';preview.alt='Mario in the recreated 3D World 1-1, with trees, hills and flowers';
 document.querySelector('#launch-resolution')!.removeAttribute('hidden');
 document.querySelector('#graphics-settings')!.innerHTML='<div class="setting-row"><div><h3>3D resolution</h3><p>The original 16:15 frame, rendered in 3D.<br>Higher resolutions need a stronger graphics chip.</p></div><select id="res" aria-label="3D resolution"><option value="1K">1K · 1024 × 960</option><option value="2K">2K · 1536 × 1440</option><option value="4K">4K · 2304 × 2160</option></select></div><div class="setting-row"><div><h3>Graphics</h3><p>High adds soft shadows, glow and smoothing.<br>Low is several times faster on laptops.</p></div><select id="quality" aria-label="3D graphics quality"><option value="high">High</option><option value="low">Low</option></select></div>';
 const params=new URLSearchParams(location.search),selected=params.get('res')??'1K';
 const resPickers=[document.querySelector<HTMLSelectElement>('#launch-res')!,document.querySelector<HTMLSelectElement>('#res')!];
 for(const picker of resPickers){
  picker.value=selected in heights?selected:'1K';
  picker.addEventListener('change',()=>setResolution(picker.value));
 }
 const qualityPickers=[document.querySelector<HTMLSelectElement>('#launch-quality')!,document.querySelector<HTMLSelectElement>('#quality')!];
 for(const picker of qualityPickers){
  picker.value=params.get('quality')==='low'?'low':'high';
  picker.addEventListener('change',()=>setQuality(picker.value as 'high'|'low'));
 }
}
function remember(key:string,value:string){const url=new URL(location.href);url.searchParams.set(key,value);history.replaceState(null,'',url);}
function setResolution(preset:string){if(!('setResolution' in view))return;view.setResolution(heights[preset]);for(const p of document.querySelectorAll<HTMLSelectElement>('#launch-res,#res'))p.value=preset;remember('res',preset);if(loaded)draw();}
function setQuality(quality:'high'|'low'){if(!('setQuality' in view))return;view.setQuality(quality);for(const p of document.querySelectorAll<HTMLSelectElement>('#launch-quality,#quality'))p.value=quality;remember('quality',quality);if(loaded)draw();}
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
function lighterSetting():{label:string;apply:()=>void}|undefined{
 if(!('setResolution' in view))return undefined;
 if(document.querySelector<HTMLSelectElement>('#quality')!.value==='high')return {label:'Use Low graphics',apply:()=>setQuality('low')};
 if(document.querySelector<HTMLSelectElement>('#res')!.value!=='1K')return {label:'Use 1K resolution',apply:()=>setResolution('1K')};
 return {label:'Play the 2D version',apply:()=>{const url=new URL(location.href);url.searchParams.delete('view');location.assign(url);}};
}
function watchSpeed(now:number){
 if(!shell.playing||sim.paused||shell.blocking||controlled||document.hidden){perfStart=0;return;}
 if(!perfStart){perfStart=now;perfFrames=0;return;}
 perfFrames++;const span=now-perfStart;if(span<1000)return;
 const fps=perfFrames*1000/span;perfStart=now;perfFrames=0;perfSlow=fps<50?perfSlow+1:0;
 if(perfSlow<3||!perf.hidden||perfDismissed)return;
 const speed=Math.round(Math.min(fps,NATIVE_HZ)/NATIVE_HZ*100),lighter=lighterSetting();
 perfText.innerHTML=`<b>The game is running at ${speed}% speed.</b> Your device is drawing ${Math.round(fps)} frames a second and the game needs 60. Every frame is still played, so the game slows down instead of skipping ahead. ${lighter?'A lighter setting should help.':'Closing other tabs or apps may help.'}`;
 perfLower.hidden=!lighter;if(lighter){perfLower.textContent=lighter.label;perfLower.onclick=()=>{lighter.apply();perf.hidden=true;perfSlow=0;canvas.focus();};}
 perf.hidden=false;
}
document.querySelector('#perf-dismiss')!.addEventListener('click',()=>{perf.hidden=true;perfDismissed=true;canvas.focus();});
document.querySelector('#home-button')!.addEventListener('click',()=>{clearInput();sim.reset();soundEvents();draw();perf.hidden=true;shell.home();});
let last=performance.now(),accumulator=0;
// At most one game frame per drawn frame: if drawing falls below the native rate, the whole game (timer included) slows in proportion instead of skipping frames.
function animate(now:number){watchSpeed(now);if(!controlled&&!shell.blocking){accumulator+=Math.min(250,now-last);const dt=1000/NATIVE_HZ;if(accumulator>=dt){sim.step(heldButtons(0),1,heldButtons(1));tappedKeys.clear();tappedPointers.clear();accumulator=Math.min(accumulator-dt,dt);}soundEvents();if(shell.playing)draw();}last=now;requestAnimationFrame(animate);}
requestAnimationFrame(animate);

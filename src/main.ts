import {Simulation,NATIVE_HZ} from './simulation.js';
import {GameRenderer} from './renderer.js';
import {observedLevels} from './levels.js';
import {AudioEngine} from './audio.js';
import type {Button} from './types.js';
import {GameShell} from './shell.js';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const status=document.querySelector<HTMLParagraphElement>('#status')!;
const is3D=new URLSearchParams(location.search).get('view')==='25d';
document.body.dataset.view=is3D?'25d':'2d';
const sim=new Simulation(observedLevels());const view=is3D?new (await import('./render25d/index.js')).Renderer25D(canvas):new GameRenderer(canvas);const audio=new AudioEngine();
const heldKeys=new Set<string>();const heldPointers=new Map<number,Button>();let controlled=false;let muted=false;let loaded=false;
const shell=new GameShell({pause:setPaused,isPaused:()=>sim.paused,clear:clearInput,restart:()=>{sim.reset();soundEvents();draw();},focus:()=>canvas.focus()});
const keyMaps=shell.maps;
if('setResolution' in view){
 document.querySelector('.edition')!.textContent='REMASTERED · 3D';
 document.querySelector('.preview-edition')!.textContent='THE SAME ADVENTURE, IN 3D';
 const preview=document.querySelector<HTMLImageElement>('.preview-image img')!;preview.src=import.meta.env.BASE_URL+'assets25d/preview.png';preview.alt='Mario in the recreated 3D World 1-1, with trees, hills and flowers';
 document.querySelector('#launch-resolution')!.removeAttribute('hidden');
 document.querySelector('#graphics-settings')!.innerHTML='<div class="setting-row"><div><h3>3D resolution</h3><p>The original 16:15 frame, rendered in 3D.<br>Lower resolution uses less graphics power.</p></div><select id="res" aria-label="3D resolution"><option value="1K">1K · 1024 × 960</option><option value="1080p">1080p · 1152 × 1080</option><option value="2K">2K · 1536 × 1440</option><option value="4K">4K · 2304 × 2160</option></select></div>';
 const heights:Record<string,number>={'1K':960,'1080p':1080,'2K':1440,'4K':2160};
 const pickers=[document.querySelector<HTMLSelectElement>('#launch-res')!,document.querySelector<HTMLSelectElement>('#res')!];
 const selected=new URLSearchParams(location.search).get('res')??'1K';
 for(const picker of pickers){
  picker.value=selected in heights?selected:'1K';
  picker.addEventListener('change',()=>{view.setResolution(heights[picker.value]);for(const other of pickers)other.value=picker.value;const url=new URL(location.href);url.searchParams.set('res',picker.value);history.replaceState(null,'',url);if(loaded)draw();});
 }
}
function clearInput(){heldKeys.clear();heldPointers.clear();}
function setPaused(paused:boolean){sim.paused=paused;audio.setPaused(paused);if(loaded)draw();}
function heldButtons(player:number){
 const keys=Array.from(heldKeys,key=>keyMaps[player][key]).filter((button):button is Button=>button!==undefined);
 const active=sim.phase==='title'||!sim.twoPlayer?0:sim.currentPlayer;
 return [...new Set([...keys,...(player===active?heldPointers.values():[])])];
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
 void activate();heldKeys.add(event.code);
});
addEventListener('keyup',event=>heldKeys.delete(event.code));
addEventListener('blur',()=>{clearInput();if(sim.phase==='play'&&!controlled){setPaused(true);shell.wake();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(shell.playing&&!controlled)setPaused(true);}});
document.querySelector('#start')!.addEventListener('click',start);
document.querySelector('#pause')!.addEventListener('click',pause);document.querySelector('#mute')!.addEventListener('click',()=>{mute();void activate();});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-button]')){
 button.addEventListener('pointerdown',event=>{event.preventDefault();if(shell.blocking)return;button.setPointerCapture(event.pointerId);heldPointers.set(event.pointerId,button.dataset.button as Button);void activate();});
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
let last=performance.now(),accumulator=0;
function animate(now:number){if(!controlled&&!shell.blocking){accumulator+=Math.min(250,now-last);const dt=1000/NATIVE_HZ;while(accumulator>=dt){sim.step(heldButtons(0),1,heldButtons(1));accumulator-=dt;}soundEvents();if(shell.playing)draw();}last=now;requestAnimationFrame(animate);}
requestAnimationFrame(animate);

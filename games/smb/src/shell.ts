import {CONTROL_STORAGE,defaultBindings,readBindings,rebind,keysFor,type Bindings} from './controls.js';
import type {Button} from './types.js';
type Actions={pause:(paused:boolean)=>void;isPaused:()=>boolean;clear:()=>void;restart:()=>void;focus:()=>void};
const ACTIONS:[Button,string][]=[['left','Move left'],['right','Move right'],['up','Look up / climb'],['down','Crouch / pipe'],['a','Jump / swim'],['b','Run / fire'],['start','Start / pause'],['select','Select players']];
export class GameShell{
 readonly maps:Bindings;private player=0;private pending?:Button;private beforeMenu=false;private idleTimer=0;private toastTimer=0;
 private dialog=document.querySelector<HTMLDialogElement>('#settings')!;
 constructor(private actions:Actions){
  let saved:string|null=null;try{saved=localStorage.getItem(CONTROL_STORAGE);}catch{/* Controls still work when browser storage is unavailable. */}
  this.maps=readBindings(saved);this.renderBindings();
  for(const id of ['controls-open','quick-controls','menu','settings-open'])document.getElementById(id)!.addEventListener('click',()=>this.open(id==='settings-open'?'display':'controls'));
  document.querySelector('.brand')!.addEventListener('click',e=>{e.preventDefault();this.open('controls');});
  document.querySelector('#settings-close')!.addEventListener('click',()=>this.close());
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  this.dialog.addEventListener('click',e=>{if(e.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.close();}});
  document.querySelector('#restart')!.addEventListener('click',()=>{this.beforeMenu=false;this.close();this.actions.restart();this.home();});
  for(const id of ['fullscreen','display-fullscreen'])document.getElementById(id)!.addEventListener('click',()=>void this.fullscreen());
  document.addEventListener('fullscreenchange',()=>{document.querySelector('#fullscreen')!.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');this.wake();});
  for(const name of ['controls','display']){
   const tab=document.getElementById(name+'-tab')!;tab.addEventListener('click',()=>this.tab(name));
   tab.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const other=name==='controls'?'display':'controls';this.tab(other);document.getElementById(other+'-tab')!.focus();}});
  }
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-player]'))b.addEventListener('click',()=>{this.player=Number(b.dataset.player);this.pending=undefined;this.renderBindings();for(const p of document.querySelectorAll<HTMLButtonElement>('[data-player]'))p.setAttribute('aria-pressed',String(p===b));});
  document.querySelector('#reset-controls')!.addEventListener('click',()=>{this.maps.splice(0,2,...defaultBindings());this.pending=undefined;this.save();this.renderBindings();this.message('Default controls restored.');});
  document.addEventListener('keydown',e=>{
   if(this.pending){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape'){this.pending=undefined;this.renderBindings();this.message('Key assignment cancelled.');return;}
    const error=rebind(this.maps,this.player,this.pending,e.code);if(error){this.message(error);return;}this.pending=undefined;this.actions.clear();this.save();this.renderBindings();return;
   }
   if(e.code==='Escape'&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();if(this.dialog.open)this.close();else if(this.playing)this.open('controls');return;}
  },true);
  for(const name of ['pointermove','pointerdown','keydown','focusin'])document.addEventListener(name,()=>this.wake(),{passive:true});
 }
 get playing(){return document.body.classList.contains('playing');}
 get blocking(){return this.dialog.open;}
 private message(text:string){document.querySelector('#binding-message')!.textContent=text;}
 private save(){try{localStorage.setItem(CONTROL_STORAGE,JSON.stringify(this.maps));this.message('Your controls are saved on this browser.');}catch{this.message('Controls updated for this session. Browser storage is unavailable.');}}
 private renderBindings(){
  const root=document.querySelector('#bindings')!;root.replaceChildren();
  for(const [action,label] of ACTIONS){const row=document.createElement('div');row.className='binding-row';const text=document.createElement('span');text.textContent=label;const button=document.createElement('button');button.type='button';button.dataset.action=action;button.setAttribute('aria-label',`Change ${label.toLowerCase()} key for player ${this.player+1}`);button.textContent=this.pending===action?'Press a key…':keysFor(this.maps,this.player,action);button.classList.toggle('listening',this.pending===action);button.addEventListener('click',()=>{this.pending=action;this.renderBindings();this.message(`Press a new key for ${label.toLowerCase()}. Esc cancels.`);root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.focus();});row.append(text,button);root.append(row);}
  document.querySelector('#quick-controls')!.textContent=`${keysFor(this.maps,0,'left')} ${keysFor(this.maps,0,'right')} Move · ${keysFor(this.maps,0,'a')} Jump · ${keysFor(this.maps,0,'b')} Run`;
 }
 private tab(name:string){this.pending=undefined;this.renderBindings();for(const section of ['controls','display']){document.getElementById(section+'-panel')!.hidden=section!==name;const tab=document.getElementById(section+'-tab')!;tab.setAttribute('aria-selected',String(section===name));tab.setAttribute('tabindex',section===name?'0':'-1');}}
 open(tab='controls'){if(this.dialog.open)return;this.beforeMenu=this.actions.isPaused();this.actions.clear();this.actions.pause(true);this.tab(tab);this.dialog.showModal();this.wake();}
 close(){this.pending=undefined;this.dialog.close();this.actions.clear();this.actions.pause(this.beforeMenu);this.actions.focus();this.wake();}
 enterGame(){document.body.classList.add('playing');this.wake();}
 home(){document.body.classList.remove('playing','idle');document.querySelector<HTMLButtonElement>('#start')!.focus();}
 wake(){document.body.classList.remove('idle');window.clearTimeout(this.idleTimer);if(this.playing&&!this.dialog.open)this.idleTimer=window.setTimeout(()=>{if(!this.actions.isPaused()&&!this.dialog.open)document.body.classList.add('idle');},3000);}
 notify(message:string){const t=document.querySelector<HTMLElement>('#toast')!;t.textContent=message;t.hidden=false;window.clearTimeout(this.toastTimer);this.toastTimer=window.setTimeout(()=>t.hidden=true,5000);}
 async fullscreen(){
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else this.notify('Fullscreen isn’t available here. You can still play in this window.');}
  catch{this.notify('Fullscreen wasn’t available. The game is ready in this window.');}
 }
 requestFullscreen(){if(!document.fullscreenElement)void this.fullscreen();}
}

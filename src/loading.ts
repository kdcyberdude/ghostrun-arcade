import {DefaultLoadingManager} from 'three';
const detail=document.querySelector<HTMLElement>('#load-detail')!;
const bar=document.querySelector<HTMLProgressElement>('#load-progress')!;
const percent=document.querySelector<HTMLElement>('#load-percent')!;
let failed=0;
DefaultLoadingManager.onStart=(_url,loaded,total)=>update(loaded,total);
DefaultLoadingManager.onProgress=(_url,loaded,total)=>update(loaded,total);
DefaultLoadingManager.onError=()=>{failed++;};
function update(loaded:number,total:number){
 bar.max=total;bar.value=loaded;percent.textContent=`${Math.round(loaded/total*100)}%`;
 detail.textContent=loaded===total?'Preparing your world…':`Loading assets · ${loaded} of ${total}`;
}
export function finishLoading(){
 document.body.classList.remove('loading');document.body.classList.add('ready');
 document.querySelector<HTMLButtonElement>('#start')!.disabled=false;
 detail.textContent=failed?'Ready · some optional artwork could not load':'Ready when you are';
 document.querySelector('#loading')?.setAttribute('hidden','');
}
export function loadingError(error:unknown){
 console.error(error);document.body.classList.add('load-error');
 document.querySelector('#loading')?.removeAttribute('hidden');
 document.querySelector('#load-title')!.textContent='Let’s try that again';
 detail.textContent=error instanceof Error&&/WebGL/.test(error.message)?'This game needs WebGL2. Enable hardware acceleration or try another browser.':'Something interrupted loading. Check your connection and try again.';
 bar.hidden=true;percent.hidden=true;document.querySelector('#retry')?.removeAttribute('hidden');
}

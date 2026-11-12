import {finishLoading,loadingError} from './loading.js';
// Older shared links used ?view=25d; show them as ?view=3d.
{const url=new URL(location.href);if(url.searchParams.get('view')==='25d'){url.searchParams.set('view','3d');history.replaceState(null,'',url);}}
const presentation=document.querySelector<HTMLSelectElement>('#view')!;
presentation.value=new URLSearchParams(location.search).get('view')==='3d'?'3d':'2d';
{const is3D=presentation.value==='3d',toggle=document.querySelector<HTMLButtonElement>('#view-switch')!;
 if(is3D)toggle.innerHTML='<b>2D</b> <span>The original pixel art</span> <span aria-hidden="true">→</span>';
 toggle.addEventListener('click',()=>{presentation.value=is3D?'2d':'3d';presentation.dispatchEvent(new Event('change'));});}
presentation.addEventListener('change',()=>{const url=new URL(location.href);if(presentation.value==='3d')url.searchParams.set('view','3d');else url.searchParams.delete('view');location.assign(url);});
try{await import('./main.js');finishLoading();}catch(error){loadingError(error);}
document.querySelector('#retry')?.addEventListener('click',()=>location.reload());

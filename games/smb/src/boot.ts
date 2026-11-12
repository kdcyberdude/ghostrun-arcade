import {finishLoading,loadingError} from './loading.js';
// Older shared links used ?view=25d; show them as ?view=3d.
{const url=new URL(location.href);if(url.searchParams.get('view')==='25d'){url.searchParams.set('view','3d');history.replaceState(null,'',url);}}
// The page loads one version at a time; choosing the other version reloads the page with it.
{const is3D=new URLSearchParams(location.search).get('view')==='3d';
 for(const card of document.querySelectorAll<HTMLButtonElement>('.version')){
  const mine=(card.dataset.view==='3d')===is3D;card.setAttribute('aria-checked',String(mine));
  card.addEventListener('click',()=>{if(mine)return;const url=new URL(location.href);if(card.dataset.view==='3d')url.searchParams.set('view','3d');else url.searchParams.delete('view');location.assign(url);});
 }
 document.querySelector('#start')!.firstChild!.textContent=is3D?'Play 3D ':'Play 2D ';}
try{await import('./main.js');finishLoading();}catch(error){loadingError(error);}
document.querySelector('#retry')?.addEventListener('click',()=>location.reload());

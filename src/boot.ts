import {finishLoading,loadingError} from './loading.js';
// Older shared links used ?view=25d; show them as ?view=3d.
{const url=new URL(location.href);if(url.searchParams.get('view')==='25d'){url.searchParams.set('view','3d');history.replaceState(null,'',url);}}
const presentation=document.querySelector<HTMLSelectElement>('#view')!;
presentation.value=new URLSearchParams(location.search).get('view')==='3d'?'3d':'2d';
presentation.addEventListener('change',()=>{const url=new URL(location.href);if(presentation.value==='3d')url.searchParams.set('view','3d');else url.searchParams.delete('view');location.assign(url);});
try{await import('./main.js');finishLoading();}catch(error){loadingError(error);}
document.querySelector('#retry')?.addEventListener('click',()=>location.reload());

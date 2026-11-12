import {finishLoading,loadingError} from './loading.js';
const presentation=document.querySelector<HTMLSelectElement>('#view')!;
presentation.value=new URLSearchParams(location.search).get('view')==='25d'?'25d':'2d';
presentation.addEventListener('change',()=>{const url=new URL(location.href);if(presentation.value==='25d')url.searchParams.set('view','25d');else url.searchParams.delete('view');location.assign(url);});
try{await import('./main.js');finishLoading();}catch(error){loadingError(error);}
document.querySelector('#retry')?.addEventListener('click',()=>location.reload());

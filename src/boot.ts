import {finishLoading,loadingError} from './loading.js';
try{await import('./main.js');finishLoading();}catch(error){loadingError(error);}
document.querySelector('#retry')?.addEventListener('click',()=>location.reload());

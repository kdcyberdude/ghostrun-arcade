// Actual GPU regression for alpha/depth instrumentation, independent of authored asset silhouettes.
import {openGame} from './lib.js';
const g=await openGame({view:'3d',query:'quality=low&scale=1'});
try{const results=await g.page.evaluate(async()=>{const m=await import('/tools/visual3d/visibility-check-page.ts');return m.check((window as any).render3d.gl);});if(g.errors.length)throw Error(g.errors.join('\n'));console.log('GPU ALPHA / DEPTH VISIBILITY PASS',JSON.stringify(results));}finally{await g.close();}

// Actual authored mesh-part depth comparison at the highest native OAM address.
import {openGame} from './lib.js';
const backend=process.argv.find(a=>a.startsWith('--backend='))?.slice(10)??'gpu',scales=process.argv.includes('--native-resolution')?[1]:[1,4];
const g=await openGame({view:'3d',backend,query:'quality=low&scale=1'});
try{const result=await g.page.evaluate(async scales=>{
 const m=await import('/tools/visual3d/sprite-model-depth-check-page.ts');return m.check(scales);
 },scales);if(g.errors.length)throw Error(g.errors.join('\n'));console.log('AUTHORED MODEL DEPTH AUDIT',JSON.stringify({backend,renderer:g.renderer,result}));}finally{await g.close();}

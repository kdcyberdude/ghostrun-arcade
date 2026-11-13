import {openGame} from './lib.js';
const backend=process.argv.find(a=>a.startsWith('--backend='))?.slice(10)??'gpu',quality=process.argv.includes('--high')?'high':'low';
const game=await openGame({view:'3d',backend,query:'quality='+quality+'&scale=1'});
try{const result=await game.page.evaluate(async()=>{const m=await import('/tools/visual3d/sprite-priority-check-page.ts');return m.check((window as any).render3d.gl);});if(game.errors.length)throw Error(game.errors.join('\n'));console.log('NATIVE SPRITE PRIORITY PASS',JSON.stringify({backend,renderer:game.renderer,quality,result}));}finally{await game.close();}

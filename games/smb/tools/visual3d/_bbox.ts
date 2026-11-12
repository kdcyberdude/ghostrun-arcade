import {openGame} from './lib.js';
const g=await openGame({view:'3d',query:'quality=low'});
const r=await g.page.evaluate(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js').catch(()=>null);const w=window as any,kit=w.render3d.kit;const out:any={};
 for(const [n,gl] of kit.gltf){const b={min:[1e9,1e9,1e9],max:[-1e9,-1e9,-1e9]};gl.scene.updateMatrixWorld(true);gl.scene.traverse((o:any)=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const bb=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);for(let i=0;i<3;i++){b.min[i]=Math.min(b.min[i],[bb.min.x,bb.min.y,bb.min.z][i]);b.max[i]=Math.max(b.max[i],[bb.max.x,bb.max.y,bb.max.z][i]);}});
  out[n]=b.min.map((v,i)=>`${v.toFixed(2)}..${b.max[i].toFixed(2)}`).join(' ');}
 return out;});
for(const [k,v] of Object.entries(r))console.log(k.padEnd(24),v);await g.close();

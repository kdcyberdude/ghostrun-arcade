// Publish raw Blender exports (visual25d/blender/out/*.glb) as optimised runtime models in assets25d/models/ and write index.json.
// Usage: node visual25d/tools/optimize.mjs [name ...]     (no names = everything in out/)
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,meshopt,resample} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {readdir,mkdir,stat,writeFile} from 'node:fs/promises';
const SRC='visual25d/blender/out/',DST='assets25d/models/';
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
await mkdir(DST,{recursive:true});
const wanted=process.argv.slice(2);
const files=(await readdir(SRC)).filter(f=>f.endsWith('.glb')&&(!wanted.length||wanted.includes(f.slice(0,-4))));
for(const f of files){
 const doc=await io.read(SRC+f);
 // Skinned / morphing characters keep their exact vertex data (weld could merge morph-distinct vertices); static kit pieces are welded.
 const animated=doc.getRoot().listAnimations().length>0||doc.getRoot().listSkins().length>0;
 await doc.transform(dedup(),...(animated?[resample()]:[weld()]),prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
 await io.write(DST+f,doc);const a=(await stat(SRC+f)).size,b=(await stat(DST+f)).size;console.log(f,(a/1024).toFixed(0)+'KB ->',(b/1024).toFixed(0)+'KB');
}
const models=(await readdir(DST)).filter(f=>f.endsWith('.glb')).map(f=>f.slice(0,-4)).sort();
await writeFile(DST+'index.json',JSON.stringify({models},null,1)+'\n');console.log('index:',models.length,'models');

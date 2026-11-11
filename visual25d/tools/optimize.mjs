// Publish raw Blender exports (visual25d/blender/out/*.glb) as optimised runtime models in assets25d/models/ and write index.json.
// Usage: node visual25d/tools/optimize.mjs [name ...]     (no names = everything in out/)
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,meshopt,resample} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {readdir,mkdir,stat,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const SRC='visual25d/blender/out/',DST='assets25d/models/';
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
await mkdir(DST,{recursive:true});
const wanted=process.argv.slice(2);
const plants=new Set(['veg_fern_02','veg_flower_empodium','veg_flower_gazania','veg_flower_ursinia','veg_grass_medium_02','veg_periwinkle_plant','veg_rock_moss_set_01','veg_shrub_sorrel_01','veg_shrub_02']);
// Full tree scans are already rendered to impostors; ship only vegetation used by the renderer.
const used=(name)=>!name.startsWith('veg_')||plants.has(name);
const files=(await readdir(SRC)).filter(f=>f.endsWith('.glb')&&used(f.slice(0,-4))&&(!wanted.length||wanted.includes(f.slice(0,-4))));
for(const f of files){
 const doc=await io.read(SRC+f);
 // Skinned / morphing characters keep their exact vertex data (weld could merge morph-distinct vertices); static kit pieces are welded.
 const animated=doc.getRoot().listAnimations().length>0||doc.getRoot().listSkins().length>0;
 await doc.transform(dedup(),...(animated?[resample()]:[weld()]),prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
 await io.write(DST+f,doc);const a=(await stat(SRC+f)).size,b=(await stat(DST+f)).size;console.log(f,(a/1024).toFixed(0)+'KB ->',(b/1024).toFixed(0)+'KB');
}
const models=(await readdir(DST)).filter(f=>f.endsWith('.glb')).map(f=>f.slice(0,-4)).filter(used).sort();
if(!wanted.length){
 for(const file of ['nature','world'])for(const [name] of (await readFile(`src/render25d/${file}.ts`,'utf8')).matchAll(/veg_[a-z0-9_]+/g))assert.ok(models.includes(name),`Missing rendered vegetation: ${name}`);
 for(const name of ['mario','goomba','pipe_top'])assert.ok(models.includes(name),`Missing required model: ${name}`);
}
await writeFile(DST+'index.json',JSON.stringify({models},null,1)+'\n');console.log('index:',models.length,'models');

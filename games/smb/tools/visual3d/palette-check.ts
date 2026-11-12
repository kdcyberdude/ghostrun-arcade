// Render-only native palette regression, including delayed VRAM state and independent free-piece palettes.
// npx tsx tools/visual3d/palette-check.ts (V25_PORT selects a private server port)
import {openGame} from './lib.js';
import nesPalette from '../../assets/nes-rgb-palette.json';
const g=await openGame({view:'3d',query:'quality=low&scale=1'});
try{
 const rows=await g.page.evaluate(async()=>{
  const w=window as any,s=w.marioDebug.simulation,{GOLD}=await import('/src/render3d/proc.ts');w.mario.reset({playing:true});
  s.phase='play';s.camera=0;s.area.palette=0;s.area.decorations=[];s.tiles=new Map([['8,6',192],['10,6',194]]);s.freeTiles=[{id:194,x:192,y:96,palette:1}];s.enemies=[];s.items=[];
  const spriteGold=GOLD.color.getHexString(),out=[];
  for(const rotation of [0,1,4,5,6,7]){
   s.paletteClock.draw=rotation;s.colorRotations=rotation+2;w.render3d.render(s);
   const materials=[];for(const [key,pool] of w.render3d.world.pools)if(key.startsWith('block_question@')||key.startsWith('coin_tile@'))for(const mesh of pool.meshes)if(mesh.count)materials.push({key,name:mesh.material.name,color:mesh.material.color.getHexString()});
   out.push({rotation,materials,spriteGoldUnchanged:GOLD.color.getHexString()===spriteGold});
  }
  return out;
 });
 const hex=(index:number)=>nesPalette.colors[index].map(v=>v.toString(16).padStart(2,'0')).join('');
 let glyph:string|undefined;
 for(const row of rows){
  if(!row.spriteGoldUnchanged)throw Error('Background palette changed the independent sprite coin material');
  const bodies=row.materials.filter(m=>!m.name||m.name.startsWith('M_Question'));
  if(bodies.length!==3)throw Error('Expected question body, grid coin and independently paletted free coin: '+JSON.stringify(row));
  for(const material of bodies){const index=row.rotation?[0x27,0x27,0x27,0x17,0x07,0x17][(row.rotation-1)%6]:material.key.endsWith('palette1')?0x17:0x27;if(material.color!==hex(index))throw Error(JSON.stringify({row,material,expected:hex(index)}));}
  const current=row.materials.find(m=>m.name==='M_Glyph')?.color;if(!current)throw Error('Question glyph material missing');if(glyph&&glyph!==current)throw Error('Native body palette recolored the question glyph');glyph=current;
 }
 if(g.errors.length)throw Error(g.errors.join('\n'));console.log('NATIVE BACKGROUND PALETTES PASS',rows.length+' phases, delayed display state, independent free palette, sprite material isolation');
}finally{await g.close();}

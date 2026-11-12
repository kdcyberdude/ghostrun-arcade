// Runtime vegetation uses tree impostors, not the source tree meshes.
export const NATURE_MODELS = new Set([
 'veg_fern_02','veg_flower_empodium','veg_flower_gazania','veg_flower_ursinia',
 'veg_grass_medium_02','veg_periwinkle_plant','veg_rock_moss_set_01','veg_shrub_sorrel_01',
 'veg_shrub_02', // World uses this published-kit marker to enable photographic scenery.
]);
export const SKY_IDS = {
 ground:'kloofendal_48d_partly_cloudy_puresky',snow:'kloofendal_48d_partly_cloudy_puresky',
 night:'narrow_moonlit_road',sky:'kloofendal_48d_partly_cloudy_puresky',
};
export const NATURE_TEXTURES = ['leafy_grass','aerial_grass_rock','excavated_soil_wall','snow_02','dark_rock_02','castle_brick_01'];
export const isRuntimeModel = name => !name.startsWith('veg_') || NATURE_MODELS.has(name);
/** Paths relative to assets25d. Keep source files and licenses intact in the checkout. */
export function isRuntimeAsset(path){
 if(path==='ph/models'||path.startsWith('ph/models/'))return false;
 if(path.startsWith('models/')&&path.endsWith('.glb'))return isRuntimeModel(path.slice(7,-4));
 if(path.startsWith('ph/tex/')&&path.endsWith('.jpg'))return NATURE_TEXTURES.some(id=>['diff','nor','arm'].some(map=>path===`ph/tex/${id}_${map}.jpg`));
 if(path.startsWith('ph/hdri/')&&/\.(hdr|jpg)$/.test(path)){
  const file=path.slice(8);
  // Night's visible sky is painted; only its HDR contributes to lighting.
  return Object.values(SKY_IDS).some(id=>file===id+'_2k.hdr'||id!==SKY_IDS.night&&file===id+'_bg.jpg');
 }
 return true;
}

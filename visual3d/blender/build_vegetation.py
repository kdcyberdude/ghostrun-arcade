"""Game-ready vegetation/rock GLBs from the CC0 Poly Haven scans in assets3d/ph/models (fetched by visual3d/tools/polyhaven.py).
Each scan is imported, decimated to a triangle budget, scaled to tile units (1 unit = 16 px ~ 0.55 m, so 1 m = 1.8 units) and exported to out/veg_<id>.glb.
Run: visual3d/blender/run.sh visual3d/blender/build_vegetation.py"""
import bpy, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')); SRC = os.path.join(ROOT, 'assets3d', 'ph', 'models'); OUT = os.path.join(HERE, 'out')
METRE = 1.8
BUDGET = {'island_tree_01': 9000, 'island_tree_02': 30000, 'jacaranda_tree': 30000, 'tree_small_02': 30000, 'shrub_01': 3000, 'shrub_02': 3000, 'shrub_04': 3000, 'grass_medium_01': 1500, 'grass_medium_02': 1500, 'fern_02': 2000, 'rock_moss_set_01': 4000, 'boulder_01': 2500, 'flower_gazania': 8000, 'flower_ursinia': 8000, 'flower_empodium': 6000, 'periwinkle_plant': 8000, 'shrub_sorrel_01': 4000}
ONLY = os.environ.get('VEG_ONLY'); BUDGET = {k: v for k, v in BUDGET.items() if not ONLY or k in ONLY.split(',')}
def tris(objs): return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs if o.type == 'MESH')
for mid, budget in BUDGET.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, mid, mid + '.gltf'))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']; before = tris(meshes)
    if before > budget:
        for o in meshes:
            share = budget * (tris([o]) / before); ratio = max(0.01, min(1.0, share / max(1, tris([o]))))
            m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = ratio; m.use_collapse_triangulate = True
    for o in bpy.context.scene.objects:
        if o.parent is None: o.scale = [s * METRE for s in o.scale]
    for o in bpy.context.scene.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'veg_' + mid + '.glb'), export_format='GLB', export_yup=True, export_apply=True, export_image_format='WEBP', export_animations=False)
    print(f'VEG {mid}: {before} -> {tris(meshes)} tris (after decimate, before apply estimate)')

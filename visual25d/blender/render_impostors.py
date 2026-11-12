"""Impostor cards for background trees: each full-resolution CC0 Poly Haven tree scan (assets25d/ph/models, fetched by visual25d/tools/polyhaven.py)
is rendered with Cycles from the front (the 2.5D camera never rotates, it only slides sideways), from several yaw angles, onto a transparent film.
Decimating leaf-card scans destroys the foliage; an impostor keeps every leaf at a cost of one quad per tree.
Output: assets25d/impostors/<id>_<n>.webp (RGBA, trunk base at the bottom centre) + assets25d/impostors/index.json (views, frame width/height in metres).
Run: visual25d/blender/run.sh visual25d/blender/render_impostors.py   (env IMPOSTOR_DEVICE=CPU to avoid the GPU; IMPOSTOR_RES, IMPOSTOR_SAMPLES)"""
import bpy, os, json, math
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(ROOT, 'assets25d', 'ph', 'models'); OUT = os.path.join(ROOT, 'assets25d', 'impostors'); os.makedirs(OUT, exist_ok=True)
TREES = {'island_tree_02': 3, 'tree_small_02': 3, 'jacaranda_tree': 2}
RES = int(os.environ.get('IMPOSTOR_RES', '1024')); SAMPLES = int(os.environ.get('IMPOSTOR_SAMPLES', '96'))
index = {}

def setup_render():
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    dev = os.environ.get('IMPOSTOR_DEVICE', 'GPU')
    if dev == 'GPU':
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA'):
            try:
                prefs.compute_device_type = kind; prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices: d.use = d.type == kind
                    sc.cycles.device = 'GPU'; break
            except TypeError: pass
    sc.render.film_transparent = True; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.cycles.max_bounces = 6; sc.cycles.transparent_max_bounces = 32
    w = bpy.data.worlds.new('sky'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.55, 0.68, 0.9, 1); bg.inputs[1].default_value = 0.8
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; sun.angle = math.radians(3); sun.color = (1.0, 0.95, 0.88)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(-35))  # from the front-left, above (matches the 2.5D sun)

for mid, views in TREES.items():
    if not views: continue
    bpy.ops.wm.read_factory_settings(use_empty=True); setup_render(); sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, mid, mid + '.gltf'))
    roots = [o for o in sc.objects if o.parent is None and o.type != 'LIGHT']
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in sc.objects if o.type == 'MESH' for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
    for o in roots: o.location.x -= cx; o.location.y -= cy  # canopy centre over the origin, so yaw keeps it in frame
    piv = bpy.data.objects.new('pivot', None); sc.collection.objects.link(piv)
    for o in roots: o.parent = piv
    radius = math.hypot(hi.x - lo.x, hi.y - lo.y) / 2; height = hi.z - lo.z; cx = cy = 0.0
    fw, fh = 2 * radius * 1.02, height * 1.02  # tight frame, ground on the bottom edge
    size = max(fw, fh)
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = size; co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.location = (cx, cy - 100, lo.z + fh / 2); co.rotation_euler = (math.radians(90), 0, 0); cam.clip_end = 300
    sc.render.resolution_x = max(8, round(RES * fw / size / 8) * 8); sc.render.resolution_y = max(8, round(RES * fh / size / 8) * 8)
    piv.location = (0, 0, 0)
    for n in range(views):
        piv.rotation_euler = (0, 0, 2 * math.pi * n / views)
        sc.render.image_settings.file_format = 'WEBP'; sc.render.image_settings.quality = 90
        sc.render.filepath = os.path.join(OUT, f'{mid}_{n}.webp'); bpy.ops.render.render(write_still=True)
        print(f'IMPOSTOR {mid}_{n}')
    index[mid] = {'views': views, 'width_m': fw, 'height_m': fh}
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)

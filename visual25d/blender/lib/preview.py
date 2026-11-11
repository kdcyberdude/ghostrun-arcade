"""Preview rendering of FINAL glb files (re-imported, so textures/skin/morphs/clips are what the renderer gets).
Cycles CPU only (never touches the GPU). Run through run.sh; sheets are assembled with the tools venv (PIL) by lib/sheet.py.
"""
import math
import os
import subprocess

import bpy
import numpy as np
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
VENV_PY = os.path.join(ROOT, '.cache25d', 'venv-tools', 'bin', 'python')
SHEET = os.path.join(os.path.dirname(__file__), 'sheet.py')


def load_glb(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    return arm, meshes


def _bounds(meshes, extra=()):
    pts = []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in meshes:
        if o.hide_render or o.hide_viewport:
            continue
        ob = o.evaluated_get(dg)
        me = ob.to_mesh()
        pts += [ob.matrix_world @ v.co for v in me.vertices]
        ob.to_mesh_clear()
    a = np.array([[p.x, p.y, p.z] for p in pts])
    return a.min(0), a.max(0)


def setup_world(strength=0.45, bg=(0.40, 0.52, 0.80)):
    sc = bpy.context.scene
    w = bpy.data.worlds.new('pw')
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bgn = nt.nodes.new('ShaderNodeBackground')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    ramp.color_ramp.elements[0].color = (0.30, 0.31, 0.34, 1)   # ground bounce
    ramp.color_ramp.elements[1].color = (0.62, 0.80, 1.0, 1)    # sky
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[1].position = 0.60
    nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bgn.inputs['Color'])
    bgn.inputs['Strength'].default_value = strength
    flat = nt.nodes.new('ShaderNodeBackground')
    flat.inputs['Color'].default_value = (0.115, 0.135, 0.19, 1)
    lp = nt.nodes.new('ShaderNodeLightPath')
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Camera Ray'], mx.inputs['Fac'])
    nt.links.new(bgn.outputs['Background'], mx.inputs[1])
    nt.links.new(flat.outputs['Background'], mx.inputs[2])
    nt.links.new(mx.outputs['Shader'], out.inputs['Surface'])
    sc.world = w
    return w


def setup_lights(centre, size):
    def add(kind, name, loc, energy, color=(1, 1, 1), sz=1.0):
        l = bpy.data.lights.new(name, kind)
        l.energy = energy
        l.color = color
        if kind == 'AREA':
            l.size = sz
        o = bpy.data.objects.new(name, l)
        bpy.context.scene.collection.objects.link(o)
        o.location = loc
        d = Vector(centre) - Vector(loc)
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        return o
    s = size
    c = Vector(centre)
    add('SUN', 'key', c + Vector((-1.2 * s, -2.0 * s, 2.2 * s)), 1.7, (1.0, 0.96, 0.9))
    add('AREA', 'fill', c + Vector((2.0 * s, -1.6 * s, 0.6 * s)), 28 * s * s, (0.85, 0.9, 1.0), 3 * s)
    add('AREA', 'rim', c + Vector((0.6 * s, 2.2 * s, 1.6 * s)), 60 * s * s, (1, 1, 1), 2 * s)


def set_clip(arm, clip, t):
    """Pose the imported armature at normalised time t of animation `clip` (None = rest)."""
    if arm is None:
        return
    ad = arm.animation_data_create()
    if clip is None:
        ad.action = None
        for pb in arm.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)
            pb.rotation_euler = (0, 0, 0)
        bpy.context.view_layer.update()
        return
    cands = [a for a in bpy.data.actions if a.name == clip or a.name.endswith('|' + clip) or a.name.split('.')[0] == clip]
    act = next((a for a in cands if a.name == clip), cands[0] if cands else None)
    if act is None:
        raise KeyError(f'no action {clip}: {[a.name for a in bpy.data.actions]}')
    ad.action = act
    if hasattr(ad, 'action_slot') and getattr(act, 'slots', None):
        ad.action_slot = act.slots[0]
    f0, f1 = act.frame_range
    fr = f0 + (f1 - f0) * t
    bpy.context.scene.frame_set(int(math.floor(fr)), subframe=fr - math.floor(fr))
    bpy.context.view_layer.update()


def recolor(mat_name, rgb):
    m = bpy.data.materials.get(mat_name)
    if not m:
        return
    for n in m.node_tree.nodes:
        if n.type in ('MIX', 'MIX_RGB'):
            sock = n.inputs[7] if n.type == 'MIX' else n.inputs[2]
            sock.default_value = (*rgb, 1.0)
            return
        if n.type == 'BSDF_PRINCIPLED' and not n.inputs['Base Color'].is_linked:
            n.inputs['Base Color'].default_value = (*rgb, 1.0)


def render_views(glb, jobs, outdir, size=(480, 480), samples=48, fov_fit=1.15, ortho=False):
    """jobs: list of dict(name, clip, t, az (deg, 0 = camera on -Y looking +Y... i.e. authored side view), el, frame='full'|'head'|(centre,size),
    shapes={'Chibi':1}, recolor={'M_X': (r,g,b)}, hide=[mesh names])."""
    os.makedirs(outdir, exist_ok=True)
    paths = []
    arm, meshes = load_glb(glb)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.render.resolution_x, sc.render.resolution_y = size
    try:
        sc.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception:
        sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.film_transparent = False
    setup_world()
    cam_d = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam_d.lens = 70
    cam_d.clip_end = 100
    lights_done = False
    for j in jobs:
        for o in meshes:
            o.hide_render = o.name in j.get('hide', [])
            if o.data.shape_keys:
                for k in o.data.shape_keys.key_blocks:
                    if k.name != 'Basis':
                        k.value = j.get('shapes', {}).get(k.name, 0.0)
        for mn, rgb in j.get('recolor', {}).items():
            recolor(mn, rgb)
        set_clip(arm, j.get('clip'), j.get('t', 0.0))
        lo, hi = _bounds(meshes)
        fr = j.get('frame', 'full')
        if fr == 'full':
            c = (lo + hi) / 2
            sz = float(max(hi - lo)) * fov_fit
        elif fr == 'head':
            c = np.array([0.15, 0, hi[2] - 0.38]); sz = 0.85
        else:
            c, sz = np.array(fr[0], float), fr[1]
        if not lights_done:
            setup_lights(c, max(sz, 1.0))
            lights_done = True
        az, el = math.radians(j.get('az', 0.0)), math.radians(j.get('el', 8.0))
        dist = sz * 2.2 if not ortho else sz * 3
        d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        cam.location = Vector(c) + d * dist
        cam.rotation_euler = (Vector(c) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        if ortho:
            cam_d.type = 'ORTHO'
            cam_d.ortho_scale = sz
        else:
            cam_d.type = 'PERSP'
            cam_d.sensor_width = 36
            cam_d.lens = 36 * dist / sz        # frame ~sz metres
        p = os.path.join(outdir, j['name'] + '.png')
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        paths.append((p, j.get('label', j['name'])))
    return paths


def make_sheet(paths, out, cols=4, cell=None, bg=(70, 76, 98)):
    import json
    import tempfile
    spec = dict(items=[dict(path=p, label=l) for p, l in paths], out=out, cols=cols, bg=bg)
    f = os.path.join(os.path.dirname(out), '.sheet.json')
    json.dump(spec, open(f, 'w'))
    subprocess.run([VENV_PY, SHEET, f], check=True)
    os.remove(f)

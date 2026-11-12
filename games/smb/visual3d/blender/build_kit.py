"""Environment kit (blocks, pipes, castle pieces) for the 3D renderer. Rebuilds every GLB from scratch.
Run: visual3d/blender/run.sh visual3d/blender/build_kit.py
Textures are generated procedurally here with numpy (no external images), so the kit is fully reproducible and licence-free.
Conventions: visual3d/CONTRACT.md (1 unit = 1 tile, Blender faces +X / up +Z / camera side -Y, exported Y-up)."""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); TEX = os.path.join(HERE, 'out', 'tex'); PREV = os.path.join(HERE, 'previews')
for d in (OUT, TEX, PREV): os.makedirs(d, exist_ok=True)
RES = 512

# ---------------------------------------------------------------- procedural textures (numpy)
def value_noise(res, cells, seed, octaves=4):
    rng = np.random.default_rng(seed); out = np.zeros((res, res)); amp, tot = 1.0, 0.0
    for o in range(octaves):
        n = cells * 2 ** o; g = rng.random((n + 1, n + 1)); g[-1, :] = g[0, :]; g[:, -1] = g[:, 0]
        t = np.linspace(0, n, res, endpoint=False); i = t.astype(int); f = t - i; f = f * f * (3 - 2 * f)
        a = g[np.ix_(i, i)]; b = g[np.ix_(i, i + 1)]; c = g[np.ix_(i + 1, i)]; d = g[np.ix_(i + 1, i + 1)]
        fy, fx = f[:, None], f[None, :]
        out += amp * ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy); tot += amp; amp *= 0.5
    return out / tot

def voronoi(res, n, seed):
    rng = np.random.default_rng(seed); pts = rng.random((n, 2)); y, x = np.mgrid[0:res, 0:res] / res
    f1 = np.full((res, res), 9.0); f2 = np.full((res, res), 9.0); cell = np.zeros((res, res), int)
    for k, (px, py) in enumerate(pts):
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                d = np.hypot(x - px - ox, y - py - oy); closer = d < f1
                f2 = np.where(closer, f1, np.minimum(f2, d)); cell = np.where(closer, k, cell); f1 = np.where(closer, d, f1)
    return f1, f2, cell

def bricks(res, rows, per_row, mortar, seed):
    """Height map of a running-bond brick wall: 1 inside bricks with rounded edges, 0 in mortar; plus per-brick id."""
    y, x = np.mgrid[0:res, 0:res] / res; r = np.floor(y * rows); off = (r % 2) * 0.5 / per_row
    u = (x + off) * per_row; v = y * rows; fu, fv = u - np.floor(u), v - np.floor(v)
    edge = np.minimum(np.minimum(fu, 1 - fu) * rows / per_row * 1.0, np.minimum(fv, 1 - fv))
    h = np.clip((edge - mortar) / 0.06, 0, 1); h = np.sin(h * math.pi / 2)
    bid = (np.floor(u) % per_row + r * per_row).astype(int); return h, bid

def normal_from_height(h, strength):
    gy, gx = np.gradient(h); n = np.dstack((-gx * strength, gy * strength, np.ones_like(h)))
    n /= np.linalg.norm(n, axis=2, keepdims=True); return n * 0.5 + 0.5

def save_img(name, rgb, colorspace='sRGB'):
    h, w = rgb.shape[:2]; img = bpy.data.images.new(name, w, h, alpha=False, float_buffer=False)
    rgba = np.dstack((np.clip(rgb, 0, 1), np.ones((h, w))))[::-1].astype(np.float32)
    img.pixels.foreach_set(rgba.ravel()); img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'; img.save()
    img.colorspace_settings.name = colorspace; return img

def colorize(t, stops):
    """t in [0,1] -> colour via linear stops [(t, (r,g,b)), ...] given in sRGB 0..255."""
    ts = [s[0] for s in stops]; out = np.zeros(t.shape + (3,))
    for c in range(3): out[..., c] = np.interp(t, ts, [s[1][c] / 255 for s in stops])
    return out

PALETTES = {  # (base dark, base mid, base light, mortar/groove) per theme
    '': {'ground': [(66, 30, 12), (156, 78, 34), (214, 132, 70)], 'brick': [(120, 40, 10), (200, 82, 30), (236, 132, 74)], 'mortar': (52, 28, 18),
         'hard': [(110, 56, 22), (192, 112, 52), (238, 170, 104)]},
    '_ug': {'ground': [(16, 34, 52), (46, 92, 124), (96, 150, 176)], 'brick': [(14, 46, 70), (36, 108, 140), (90, 168, 196)], 'mortar': (10, 18, 28),
            'hard': [(20, 44, 62), (56, 104, 132), (110, 160, 184)]},
    '_castle': {'ground': [(50, 50, 54), (112, 110, 112), (170, 168, 166)], 'brick': [(56, 54, 58), (122, 118, 120), (180, 176, 172)], 'mortar': (26, 24, 28),
                'hard': [(60, 58, 60), (128, 124, 124), (184, 180, 176)]},
}

def tex_ground(theme):
    p = PALETTES[theme]; f1, f2, cell = voronoi(RES, 14, 7); crack = np.clip((f2 - f1) / 0.035, 0, 1)
    n = value_noise(RES, 6, 3); cellshade = (cell * 0.618) % 1
    h = crack * (0.75 + 0.25 * n); t = np.clip(0.25 + 0.5 * cellshade * 0.6 + 0.35 * n, 0, 1)
    col = colorize(t, [(0, p['ground'][0]), (0.55, p['ground'][1]), (1, p['ground'][2])]) * (0.35 + 0.65 * crack[..., None])
    return save_img('ground' + theme, col), save_img('ground' + theme + '_n', normal_from_height(h, 6), 'Non-Color')

def tex_brick(theme, name='brick'):
    p = PALETTES[theme]; h, bid = bricks(RES, 4, 2, 0.035, 1); n = value_noise(RES, 16, 9, 5)
    tint = ((bid * 0.37) % 1)[..., None]; t = np.clip(0.3 + 0.5 * n + 0.25 * tint[..., 0], 0, 1)
    col = colorize(t, [(0, p['brick'][0]), (0.5, p['brick'][1]), (1, p['brick'][2])])
    m = np.array(p['mortar']) / 255; col = col * h[..., None] + m * (1 - h[..., None])
    return save_img(name + theme, col), save_img(name + theme + '_n', normal_from_height(h * 0.9 + n * 0.12, 5), 'Non-Color')

def tex_hard(theme):
    p = PALETTES[theme]; n = value_noise(RES, 10, 21, 5); y, x = np.mgrid[0:RES, 0:RES] / RES
    t = np.clip(0.35 + 0.45 * n + 0.2 * (1 - np.maximum(abs(x - .5), abs(y - .5)) * 2), 0, 1)
    col = colorize(t, [(0, p['hard'][0]), (0.6, p['hard'][1]), (1, p['hard'][2])])
    return save_img('hard' + theme, col), save_img('hard' + theme + '_n', normal_from_height(n * 0.4, 4), 'Non-Color')

def tex_simple(name, stops, cells=12, strength=2.5, seed=31):
    n = value_noise(RES, cells, seed, 5); col = colorize(n, stops)
    return save_img(name, col), save_img(name + '_n', normal_from_height(n * 0.3, strength), 'Non-Color')


# ---------------------------------------------------------------- photoreal materials (CC0 Poly Haven scans, fetched by visual3d/tools/polyhaven.py)
PH = os.path.join(HERE, '..', '..', 'assets3d', 'ph', 'tex')
def _img(path, name, colorspace='sRGB', tint=None):
    img = bpy.data.images.load(path, check_existing=True); img.colorspace_settings.name = colorspace
    if tint is None: return img
    desat = tint[3] if len(tint) > 3 else 0.0  # optional 4th value: desaturate the scan first (0..1, e.g. warm brick -> grey castle stone); negative = boost saturation
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4); lum = px[:, :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    px[:, :3] = px[:, :3] * (1 - desat) + lum[:, None] * desat
    px[:, :3] = np.clip(px[:, :3] * np.array(tint[:3], dtype=np.float32), 0, 1)
    out = bpy.data.images.new(name, img.size[0], img.size[1], alpha=False); out.pixels.foreach_set(px.ravel())
    out.filepath_raw = os.path.join(TEX, name + '.png'); out.file_format = 'PNG'; out.save(); return out

def photo(name, tid, tint=None, metal=None, rough=None, nstrength=1.0, emission=None):
    """Principled BSDF from a scanned set: diffuse (optionally tinted), OpenGL normal, ARM (G = roughness, B = metalness)."""
    base = os.path.join(PH, tid)
    if not os.path.exists(base + '_diff.jpg'): raise SystemExit(f'missing {base}_diff.jpg: run visual3d/tools/polyhaven.py first')
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    d = nt.nodes.new('ShaderNodeTexImage'); d.image = _img(base + '_diff.jpg', name + '_diff', tint=tint); nt.links.new(d.outputs['Color'], b.inputs['Base Color'])
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = _img(base + '_nor.jpg', name + '_nor', 'Non-Color'); nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstrength
    nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    a = nt.nodes.new('ShaderNodeTexImage'); a.image = _img(base + '_arm.jpg', name + '_arm', 'Non-Color'); sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(a.outputs['Color'], sep.inputs['Color'])
    if rough is None: nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])
    else: b.inputs['Roughness'].default_value = rough
    if metal is None: nt.links.new(sep.outputs['Blue'], b.inputs['Metallic'])
    else: b.inputs['Metallic'].default_value = metal
    if emission:
        b.inputs['Emission Color'].default_value = (*[c ** 2.2 for c in emission[0]], 1); b.inputs['Emission Strength'].default_value = emission[1]
    return m

PHOTO = os.environ.get('KIT_STYLE', 'photo') == 'photo'

# ---------------------------------------------------------------- materials / meshes
def material(name, base=None, normal=None, color=(1, 1, 1), rough=0.6, metal=0.0, emission=None, nstrength=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if base:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = base; nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = (*[c ** 2.2 for c in color], 1)
    if normal:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = normal; t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstrength
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    if emission:
        b.inputs['Emission Color'].default_value = (*[c ** 2.2 for c in emission[0]], 1); b.inputs['Emission Strength'].default_value = emission[1]
    return m

def box_uv(bm):
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            c = l.vert.co
            if ax == 1: u, v = c.x * (1 if n.y < 0 else -1), c.z     # front (-Y) / back
            elif ax == 0: u, v = c.y * (-1 if n.x > 0 else 1), c.z   # sides
            else: u, v = c.x, c.y * (1 if n.z > 0 else -1)           # top / bottom
            l[uv].uv = (u + 0.5, v + 0.5)

def mesh_obj(name, bm, mat, smooth_angle=0.7):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    for p in me.polygons: p.use_smooth = True
    me.set_sharp_from_angle(angle=smooth_angle)
    if mat: me.materials.append(mat)
    return o

def beveled_box(size=(1, 1, 1), bevel=0.05, segments=3, center=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(center)
    if bevel > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segments, profile=0.5, affect='EDGES')
    bm.normal_update(); box_uv(bm); return bm

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def export(name, objs):
    for o in bpy.context.scene.objects: o.select_set(o in objs)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_selection=True, export_yup=True,
                              export_image_format='WEBP', export_apply=True, export_animations=False)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs if o.type == 'MESH'); print(f'KIT {name}: {tris} tris'); return tris

# ---------------------------------------------------------------- pieces
def text_mesh(ch, size, depth, bevel):
    cu = bpy.data.curves.new('glyph', 'FONT'); cu.body = ch; cu.size = size; cu.extrude = depth; cu.bevel_depth = bevel; cu.bevel_resolution = 3
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; o = bpy.data.objects.new('glyph', cu); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target='MESH'); return bpy.context.view_layer.objects.active

def rivets(mat, z_face, inset=0.36, r=0.045):
    objs = []
    for sx in (-1, 1):
        for sz in (-1, 1):
            bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r)
            for v in bm.verts: v.co.y *= 0.55; v.co += Vector((sx * inset, z_face, sz * inset))
            objs.append(mesh_obj('rivet', bm, mat))
    return objs

def build_blocks(theme):
    out = {}
    if PHOTO:
        tid = {'': 'excavated_soil_wall', '_ug': 'dark_rock_02', '_castle': 'castle_wall_varriation'}[theme]
        ground = photo('M_Ground' + theme, tid, tint={'': (1.06, 0.9, 0.74, -0.12), '_ug': (0.6, 0.92, 1.2, 0.3), '_castle': (0.82, 0.84, 0.9, 0.85)}[theme])
    else:
        gb, gn = tex_ground(theme); ground = material('M_Ground' + theme, gb, gn, rough=0.85, nstrength=1.2)
    out['block_ground' + theme] = [mesh_obj('ground', beveled_box(bevel=0.03, segments=2), ground)]
    if theme == '':  # overworld top row: grass cap with a soft hanging lip
        grass_b, grass_n = tex_simple('grass', [(0, (40, 110, 20)), (0.5, (88, 170, 36)), (1, (150, 214, 70))], 24, 3, 77)
        grass = photo('M_Grass', 'leafy_grass', tint=(0.6, 1.2, 0.36, -0.45)) if PHOTO else material('M_Grass', grass_b, grass_n, rough=0.9)
        bm = beveled_box(size=(1.02, 1.06, 0.2), bevel=0.06, segments=3, center=(0, 0, 0.42)); bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs(e.verts[0].co.x - e.verts[1].co.x) > 0.5], cuts=6)
        rng = np.random.default_rng(5)
        for v in bm.verts:
            if v.co.z < 0.36: v.co.z -= 0.05 + 0.07 * rng.random()  # irregular hanging edge
        bm.normal_update(); box_uv(bm)
        out['block_ground_top'] = [mesh_obj('ground', beveled_box(bevel=0.03, segments=2), ground), mesh_obj('grass', bm, grass, 1.2)]
        if PHOTO:  # winter top row (snow theme): same frozen soil under a thick snow cap with the same hanging lip
            snow = photo('M_SnowCap', 'snow_02', tint=(1.0, 1.04, 1.1), rough=0.55)
            sb = beveled_box(size=(1.03, 1.07, 0.26), bevel=0.09, segments=4, center=(0, 0, 0.4)); bmesh.ops.subdivide_edges(sb, edges=[e for e in sb.edges if abs(e.verts[0].co.x - e.verts[1].co.x) > 0.5], cuts=6)
            for v in sb.verts:
                if v.co.z < 0.32: v.co.z -= 0.03 + 0.08 * rng.random()
            sb.normal_update(); box_uv(sb)
            frozen = photo('M_GroundFrozen', 'excavated_soil_wall', tint=(0.78, 0.84, 0.98, 0.55))  # cold, slightly blue soil under snow
            out['block_ground_top_snow'] = [mesh_obj('ground', beveled_box(bevel=0.03, segments=2), frozen), mesh_obj('snow', sb, snow, 1.2)]
            out['block_ground_snow'] = [mesh_obj('ground', beveled_box(bevel=0.03, segments=2), frozen)]
    bb, bn = tex_brick(theme); brick = material('M_Brick' + theme, bb, bn, rough=0.75, nstrength=1.4)
    if PHOTO: brick = photo('M_Brick' + theme, 'castle_brick_02_red' if theme == '' else 'castle_brick_01', tint={'': (1.12, 0.84, 0.72, -0.3), '_ug': (0.5, 0.95, 1.25, 0.4), '_castle': (0.85, 0.87, 0.92, 0.85)}[theme])
    out['block_brick' + theme] = [mesh_obj('brick', beveled_box(bevel=0.04, segments=2), brick)]
    hb, hn = tex_hard(theme); hard = material('M_Hard' + theme, hb, hn, rough=0.7)
    if PHOTO: hard = photo('M_Hard' + theme, 'castle_wall_varriation', tint={'': (1.12, 0.86, 0.62, -0.3), '_ug': (0.55, 0.92, 1.2, 0.4), '_castle': (0.85, 0.87, 0.92, 0.85)}[theme])
    bm = beveled_box(bevel=0.16, segments=1)  # wide single-segment chamfer = the classic pyramid-faced stair block
    out['block_hard' + theme] = [mesh_obj('hard', bm, hard, 0.3)]
    wb, wn = tex_brick(theme, 'wall'); wall = material('M_Wall' + theme, wb, wn, rough=0.8, nstrength=1.2)
    if PHOTO: wall = photo('M_Wall' + theme, 'castle_brick_01', tint={'': (1.05, 0.9, 0.8, -0.2), '_ug': (0.5, 0.88, 1.2, 0.4), '_castle': (0.8, 0.82, 0.88, 0.85)}[theme])
    out['block_wall' + theme] = [mesh_obj('wall', beveled_box(bevel=0.02, segments=1), wall)]
    return out

def build_question():
    out = {}
    qb, qn = tex_simple('question', [(0, (214, 120, 0)), (0.5, (246, 168, 18)), (1, (255, 212, 90))], 8, 1.5, 3)
    gold = material('M_Question', qb, qn, rough=0.32, metal=0.25, emission=((1.0, 0.62, 0.1), 0.15))
    if PHOTO: gold = photo('M_Question', 'metal_plate', tint=(2.5, 1.8, 0.7), metal=1.0, rough=0.38, emission=((1.0, 0.6, 0.12), 0.12))  # tint > 1 lifts the grey plate scan to bright gold
    glyph_m = material('M_Glyph', color=(1.0, 0.95, 0.82), rough=0.25, metal=0.9); rivet_m = material('M_Rivet', color=(0.55, 0.42, 0.25), rough=0.3, metal=1.0)
    objs = [mesh_obj('qblock', beveled_box(bevel=0.06, segments=3), gold)]
    for face in (-1, 1):
        g = text_mesh('?', 0.78, 0.05, 0.02); g.rotation_euler = (math.pi / 2, 0, 0 if face < 0 else math.pi); g.location = (0, face * 0.5, -0.02)
        g.data.materials.clear(); g.data.materials.append(glyph_m); objs.append(g)
        objs += rivets(rivet_m, face * 0.5)
    out['block_question'] = objs
    used = material('M_Used', *tex_simple('used', [(0, (60, 34, 18)), (0.6, (112, 66, 34)), (1, (150, 96, 54))], 10, 2, 13), rough=0.55, metal=0.35)
    if PHOTO: used = photo('M_Used', 'rusty_metal_02')
    objs = [mesh_obj('used', beveled_box(bevel=0.06, segments=3), used)]
    for face in (-1, 1): objs += rivets(rivet_m, face * 0.5)
    out['block_used'] = objs
    return out

def pipe(top):
    pb, pn = tex_simple('pipe', [(0, (16, 120, 34)), (0.5, (36, 168, 58)), (1, (70, 206, 92))], 3, 1.0, 41)
    green = material('M_Pipe', pb, pn, rough=0.22, metal=0.05); dark = material('M_PipeInner', color=(0.02, 0.06, 0.02), rough=0.9)
    if PHOTO: green = photo('M_Pipe', 'green_metal_rust', tint=(0.45, 1.3, 0.5, -0.6), rough=0.3)  # glossy emerald
    objs = []
    def tube(r_out, r_in, z0, z1, mat, segs=48):
        bm = bmesh.new()
        for (r, za, zb) in ((r_out, z0, z1),):
            pass
        ring = lambda r, z: [bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for a in np.linspace(0, 2 * math.pi, segs, endpoint=False)]
        a0, a1, b1, b0 = ring(r_out, z0), ring(r_out, z1), ring(r_in, z1), ring(r_in, z0)
        for A, B in ((a0, a1), (a1, b1), (b1, b0), (b0, a0)):
            for i in range(segs): bm.faces.new((A[i], A[(i + 1) % segs], B[(i + 1) % segs], B[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.normal_update()
        uv = bm.loops.layers.uv.verify()
        for f in bm.faces:
            for l in f.loops: c = l.vert.co; l[uv].uv = ((math.atan2(c.y, c.x) / (2 * math.pi)) % 1 * 3, c.z + 0.5)
        return mesh_obj('tube', bm, mat, 0.9)
    if top:
        objs.append(tube(0.9, 0.8, -0.5, 0.1, green)); objs.append(tube(1.0, 0.8, 0.1, 0.5, green))
        bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=48, radius=0.81)
        for v in bm.verts: v.co.z = 0.05
        objs.append(mesh_obj('inner', bm, dark))
    else:
        objs.append(tube(0.9, 0.8, -0.5, 0.5, green))
    for o in objs: o.data.update()
    return objs

def castle_pieces(theme):
    out = {}; bb, bn = tex_brick(theme, 'cbrick'); m = material('M_CastleBrick' + theme, bb, bn, rough=0.8, nstrength=1.4); t = theme
    if PHOTO: m = photo('M_CastleBrick' + theme, 'castle_brick_02_red' if theme == '' else 'castle_brick_01', tint=None if theme == '' else (0.82, 0.84, 0.9, 0.85))
    out['castle_brick' + t] = [mesh_obj('cb', beveled_box(bevel=0.02, segments=1), m)]
    out['castle_crenel' + t] = [mesh_obj('cb', beveled_box(size=(1, 1, 0.5), bevel=0.02, segments=1, center=(0, 0, -0.25)), m),
                            mesh_obj('cm', beveled_box(size=(0.42, 1, 0.5), bevel=0.03, segments=2, center=(-0.29, 0, 0.25)), m),
                            mesh_obj('cm', beveled_box(size=(0.42, 1, 0.5), bevel=0.03, segments=2, center=(0.29, 0, 0.25)), m)]
    dark = material('M_CastleDark', color=(0.03, 0.02, 0.02), rough=0.95, emission=((0.6, 0.25, 0.05), 0.08))
    out['castle_dark' + t] = [mesh_obj('cd', beveled_box(size=(1, 0.3, 1), bevel=0.0, center=(0, 0.35, 0)), dark)]
    return out


# ---------------------------------------------------------------- campaign pieces (other themes)
def cyl(r, h, center=(0, 0, 0), segs=24, axis='Z', bevel=0.0):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=h)
    if axis == 'Y': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(math.pi / 2, 3, 'X'))
    if axis == 'X': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(math.pi / 2, 3, 'Y'))
    if bevel: bmesh.ops.bevel(bm, geom=[e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle() > 0.8], offset=bevel, segments=2, affect='EDGES')
    for v in bm.verts: v.co += Vector(center)
    bm.normal_update(); box_uv(bm); return bm

def sphere(r, center, scale=(1, 1, 1), segs=20):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(8, segs // 2), radius=r)
    for v in bm.verts: v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2])) + Vector(center)
    bm.normal_update(); box_uv(bm); return bm

def campaign_pieces():
    out = {}
    wood = material('M_Wood', *tex_simple('wood', [(0, (90, 50, 22)), (0.5, (150, 92, 46)), (1, (196, 136, 78))], 30, 3, 61), rough=0.8)
    if PHOTO: wood = photo('M_Wood', 'brown_planks_05')
    rope = material('M_Rope', color=(0.86, 0.74, 0.5), rough=0.9)
    # bridge (99): plank deck in the upper half + a light truss below
    objs = [mesh_obj('deck', beveled_box(size=(1.0, 1.0, 0.32), bevel=0.03, segments=2, center=(0, 0, 0.34)), wood)]
    for sx in (-0.3, 0.3): objs.append(mesh_obj('post', beveled_box(size=(0.12, 0.9, 0.5), bevel=0.02, center=(sx, 0, -0.05)), wood))
    out['block_bridge'] = objs
    # railing (11): post + rope, decoration above a bridge
    out['deco_rail'] = [mesh_obj('post', beveled_box(size=(0.12, 0.12, 0.8), bevel=0.02, center=(0, -0.3, -0.1)), wood),
                        mesh_obj('rope', cyl(0.035, 1.0, center=(0, -0.3, 0.22), axis='X'), rope)]
    # fence (77)
    out['deco_fence'] = [mesh_obj('p', beveled_box(size=(0.14, 0.14, 0.9), bevel=0.03, center=(0, 0, -0.05)), wood),
                         mesh_obj('r', beveled_box(size=(1.0, 0.08, 0.12), bevel=0.02, center=(0, 0.04, 0.18)), wood),
                         mesh_obj('r', beveled_box(size=(1.0, 0.08, 0.12), bevel=0.02, center=(0, 0.04, -0.18)), wood)]
    # cannon (100 top, 101 body)
    iron = material('M_Iron', color=(0.12, 0.12, 0.14), rough=0.35, metal=0.85); brass = material('M_Brass', color=(0.85, 0.62, 0.2), rough=0.3, metal=0.9)
    skull = material('M_Skull', color=(0.95, 0.93, 0.88), rough=0.5)
    out['cannon_top'] = [mesh_obj('barrel', cyl(0.42, 0.98, axis='X', segs=32, bevel=0.06), iron), mesh_obj('band', cyl(0.45, 0.12, center=(0.38, 0, 0), axis='X', segs=32), brass),
                         mesh_obj('band', cyl(0.45, 0.12, center=(-0.38, 0, 0), axis='X', segs=32), brass), mesh_obj('skull', sphere(0.16, (0, -0.42, 0.02), (1, 0.4, 1.1)), skull)]
    out['cannon_base'] = [mesh_obj('base', beveled_box(size=(0.8, 0.8, 1.0), bevel=0.08, segments=3), iron), mesh_obj('trim', beveled_box(size=(0.9, 0.9, 0.12), bevel=0.03, center=(0, 0, 0.44)), brass)]
    # seabed coral rock (105)
    out['block_seabed'] = [mesh_obj('coral', beveled_box(bevel=0.08, segments=3), photo('M_Seabed', 'coast_sand_rocks_02') if PHOTO else material('M_Seabed', *tex_ground_custom('seabed', [(0, (90, 40, 46)), (0.55, (196, 96, 92)), (1, (244, 168, 150))]), rough=0.9))]
    out['block_seabed_water'] = [mesh_obj('coral', beveled_box(bevel=0.08, segments=3), material('M_SeabedW', *tex_ground_custom('seabed_w', [(0, (14, 70, 40)), (0.55, (40, 150, 80)), (1, (120, 214, 140))]), rough=0.9))]
    # cloud block (136)
    cloud = material('M_CloudBlock', color=(1, 1, 1), rough=0.95, emission=((0.75, 0.82, 0.95), 0.1)); eye = material('M_CloudEye', color=(0.05, 0.05, 0.08), rough=0.3)
    objs = [mesh_obj('c', sphere(0.42, (dx, dy, dz)), cloud) for dx, dy, dz in ((-0.2, 0, -0.1), (0.2, 0, -0.1), (0, 0, 0.12), (-0.25, 0, 0.15), (0.25, 0, 0.15))]
    objs += [mesh_obj('e', sphere(0.05, (dx, -0.48, 0.1), (1, 0.4, 1.6)), eye) for dx in (-0.12, 0.12)]
    out['block_cloud'] = objs
    # bowser bridge (137): steel grating
    steel = material('M_Steel', color=(0.55, 0.56, 0.6), rough=0.3, metal=0.9)
    out['block_bowser_bridge'] = [mesh_obj('beam', beveled_box(size=(1.0, 1.0, 0.36), bevel=0.04, center=(0, 0, 0.3)), steel)] + \
                                 [mesh_obj('link', cyl(0.06, 0.9, center=(dx, -0.45, -0.1), axis='Z'), steel) for dx in (-0.35, 0.35)]
    # axe (197)
    out['axe'] = [mesh_obj('handle', cyl(0.06, 1.0, center=(0, 0, -0.05)), wood), mesh_obj('blade', beveled_box(size=(0.6, 0.12, 0.45), bevel=0.05, center=(0.18, 0, 0.25)), steel)]
    # tree-top platform (22 L, 23 M, 24 R) + trunk (76)
    leaf = material('M_Leaf', *tex_simple('leaf', [(0, (30, 96, 24)), (0.5, (70, 160, 40)), (1, (130, 206, 70))], 20, 3, 91), rough=0.85)
    bark = material('M_Bark', *tex_simple('bark', [(0, (80, 44, 20)), (0.5, (140, 82, 38)), (1, (186, 124, 66))], 40, 4, 17), rough=0.9)
    if PHOTO: bark = photo('M_Bark', 'bark_brown_02'); leaf = photo('M_Leaf', 'leafy_grass')
    out['plat_tree_m'] = [mesh_obj('top', beveled_box(size=(1.0, 1.0, 0.7), bevel=0.12, segments=3, center=(0, 0, 0.15)), leaf)]
    out['plat_tree_l'] = [mesh_obj('top', beveled_box(size=(0.9, 1.0, 0.7), bevel=0.3, segments=4, center=(0.05, 0, 0.15)), leaf)]
    out['plat_tree_r'] = [mesh_obj('top', beveled_box(size=(0.9, 1.0, 0.7), bevel=0.3, segments=4, center=(-0.05, 0, 0.15)), leaf)]
    out['trunk'] = [mesh_obj('trunk', cyl(0.36, 1.0, segs=20), bark)]
    # mushroom platform (25 L, 26 M, 27 R) + stem (79 top, 80)
    cap = material('M_MushCap', color=(0.86, 0.28, 0.12), rough=0.5); spot = material('M_MushSpot', color=(1, 0.95, 0.85), rough=0.6)
    stem = material('M_MushStem', color=(0.95, 0.86, 0.68), rough=0.7)
    for k, cx in (('m', 0), ('l', 0.05), ('r', -0.05)):
        objs = [mesh_obj('cap', beveled_box(size=(1.0 if k == 'm' else 0.9, 1.0, 0.6), bevel=0.12 if k == 'm' else 0.28, segments=4, center=(cx, 0, 0.18)), cap)]
        objs.append(mesh_obj('spot', sphere(0.14, (cx + (0.15 if k != 'r' else -0.15), -0.5, 0.2), (1, 0.25, 0.8)), spot))
        out['plat_mush_' + k] = objs
    out['mush_stem'] = [mesh_obj('stem', cyl(0.32, 1.0, segs=20), stem)]
    return out

def tex_ground_custom(name, stops):
    f1, f2, cell = voronoi(RES, 10, 23); crack = np.clip((f2 - f1) / 0.05, 0, 1); n = value_noise(RES, 8, 5)
    col = colorize(np.clip(0.3 + 0.4 * ((cell * 0.618) % 1) + 0.3 * n, 0, 1), stops) * (0.45 + 0.55 * crack[..., None])
    return save_img(name, col), save_img(name + '_n', normal_from_height(crack * 0.8 + n * 0.2, 5), 'Non-Color')

def to_blender_axes(objs):
    """Pieces are authored with z up / y depth already, which IS Blender's convention: camera side is -Y. Nothing to do; kept for clarity."""
    return objs

def main():
    only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    results = {}
    builders = [lambda: build_blocks(''), lambda: build_blocks('_ug'), lambda: build_blocks('_castle'), build_question,
                lambda: {'pipe_top': pipe(True)}, lambda: {'pipe_body': pipe(False)}, lambda: castle_pieces(''), lambda: castle_pieces('_castle'), campaign_pieces]
    for b in builders:
        clear(); pieces = b()
        for name, objs in pieces.items():
            if only and name not in only: continue
            results[name] = export(name, objs)
    with open(os.path.join(OUT, 'kit-tris.txt'), 'w') as f:
        for k, v in sorted(results.items()): f.write(f'{k} {v}\n')

main()

"""Material specs, atlas unwrap, Cycles bakes (AO / material id / vertex colour), numpy compositing of the PBR textures
(baseColor modulation, packed ORM, tangent normal map) and glTF-friendly final materials."""
import math
import os
import struct
import zlib

import bmesh
import bpy
import numpy as np

from . import detail


# ----------------------------------------------------------------------------- colour helpers
def srgb_to_lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(np.asarray(c, float), 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def hexlin(h):
    h = h.lstrip('#')
    return tuple(float(x) for x in srgb_to_lin([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]))


class MatSpec:
    """Final glTF material = Principled BSDF with baseColor(tex)*factor, ORM texture, normal texture (all baked to the atlas)."""

    def __init__(self, name, color, rough=0.6, metal=0.0, kind='smooth', params=None, bump=2.0, vcol=False,
                 emissive=None, emissive_strength=1.0, ao_albedo=0.12, ao_strength=0.9, flat=False, double_sided=False,
                 photo=None, photo_scale=1.0, chroma=0.0, contrast=1.0, sheen=0.0, sheen_rough=0.4, coat=0.0, coat_rough=0.05, overlay=None):
        self.name, self.color, self.rough, self.metal = name, tuple(color), rough, metal
        self.kind, self.params, self.bump, self.vcol = kind, params or {}, bump, vcol
        self.emissive, self.emissive_strength = emissive, emissive_strength
        self.ao_albedo, self.ao_strength = ao_albedo, ao_strength
        self.flat = flat            # no detail texture at all (pure colour/ORM from material constants)
        self.double_sided = double_sided
        self.photo, self.photo_scale, self.chroma, self.contrast = photo, photo_scale, chroma, contrast   # Poly Haven id tiled at real scale
        self.sheen, self.sheen_rough, self.coat, self.coat_rough = sheen, sheen_rough, coat, coat_rough
        self.overlay = overlay      # optional procedural kind blended on top of a photo (e.g. 'fungal')


# ----------------------------------------------------------------------------- PNG writer (no colour management involved)
def write_png(path, arr):
    """arr: uint8 (h, w, c) with row 0 = TOP of the image."""
    h, w, c = arr.shape
    ct = {1: 0, 3: 2, 4: 6}[c]
    f = arr.copy()
    f[1:] = arr[1:] - arr[:-1]
    buf = np.zeros((h, w * c + 1), np.uint8)
    buf[:, 0] = 2
    buf[0, 0] = 0
    buf[:, 1:] = f.reshape(h, -1)
    z = zlib.compress(buf.tobytes(), 9)

    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as fh:
        fh.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, ct, 0, 0, 0)) + chunk(b'IDAT', z) + chunk(b'IEND', b''))


def _to_u8(a):
    return np.clip(np.round(a * 255.0), 0, 255).astype(np.uint8)


# ----------------------------------------------------------------------------- Poly Haven photo textures (CC0)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PH_DIR = os.path.join(ROOT, '.cache25d', 'polyhaven')
M_PER_UNIT = 0.8            # realism scale: 1 tile = 0.8 m (Mario ~1.6 m tall)
_PH = {}


def _load_px(path):
    im = bpy.data.images.load(path, check_existing=False)
    im.colorspace_settings.name = 'Non-Color'
    w, h = im.size
    buf = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(buf)
    bpy.data.images.remove(im)
    return buf.reshape(h, w, 4)[..., :3]


def photo_maps(pid):
    if pid not in _PH:
        import json
        meta = json.load(open(os.path.join(PH_DIR, 'meta.json')))[pid]
        maps = {k: _load_px(os.path.join(PH_DIR, v)) for k, v in meta['files'].items()}
        _PH[pid] = (maps, meta['dims_mm'])
    return _PH[pid]


def _prefilter(img, factor):
    f = 1
    while f * 2 <= factor and img.shape[0] % (f * 2) == 0:
        f *= 2
    if f == 1:
        return img
    h, w = img.shape[:2]
    return img.reshape(h // f, f, w // f, f, -1).mean((1, 3))


def _pblur(img, r):
    """Periodic box blur (separable), radius r pixels."""
    out = img.copy()
    for ax in (0, 1):
        acc = np.zeros_like(out)
        for k in range(-r, r + 1):
            acc += np.roll(out, k, ax)
        out = acc / (2 * r + 1)
    return out


def _highpass(img, frac=0.12):
    """Remove the scan's low-frequency shading so tiling does not show a grid."""
    r = max(2, int(img.shape[0] * frac))
    b = _pblur(_pblur(img, r // 2), r // 2)
    return img, b


def _sample(img, tu, tv):
    h, w = img.shape[:2]
    x = (tu % 1.0) * w - 0.5; y = (tv % 1.0) * h - 0.5
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    g = lambda yy, xx: img[yy % h, xx % w]
    return (g(y0, x0) * (1 - fx) + g(y0, x0 + 1) * fx) * (1 - fy) + (g(y0 + 1, x0) * (1 - fx) + g(y0 + 1, x0 + 1) * fx) * fy


def photo_detail(sp, S, uv_unit_m):
    """Tile a Poly Haven scan over the atlas at true size. uv_unit_m = metres of surface per 1.0 of UV."""
    maps, dims = photo_maps(sp.photo)
    rep_u = uv_unit_m * 1000.0 / (dims[0] * sp.photo_scale)
    rep_v = uv_unit_m * 1000.0 / (dims[1] * sp.photo_scale)
    px_per_tile = S / rep_u
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    tu, tv = xx / S * rep_u, yy / S * rep_v
    out = {}
    src = _prefilter(maps['Diffuse'], maps['Diffuse'].shape[1] / max(px_per_tile, 1))
    src = src / (_pblur(_pblur(src, max(2, src.shape[0] // 16)), max(2, src.shape[0] // 16)) + 1e-3) * src.mean((0, 1))
    dif = _sample(src, tu, tv)
    big = detail.fbm(S, 6, 4, hash(sp.name) % 1000)                  # non-repeating large-scale wear/fade
    dif = dif * (0.97 + 0.06 * big[..., None])
    lum = dif @ np.array([0.2126, 0.7152, 0.0722])
    p97 = max(float(np.percentile(lum, 97)), 1e-3)
    A = np.clip(lum / p97, 0, 1)
    A = 1 - (1 - A) * sp.contrast
    neutral = dif / (dif.mean((0, 1), keepdims=True) + 1e-4) * dif.mean() / p97
    out['A'] = A.astype(np.float32)
    out['A3'] = (A[..., None] * (1 - sp.chroma) + np.clip(neutral, 0, 1.2) * sp.chroma).astype(np.float32)
    ns = _prefilter(maps['nor_gl'], maps['nor_gl'].shape[1] / max(px_per_tile, 1))
    ns = ns - _pblur(_pblur(ns, max(2, ns.shape[0] // 16)), max(2, ns.shape[0] // 16)) + np.array([0.5, 0.5, 1.0])
    nrm = _sample(ns, tu, tv)
    out['N'] = nrm.astype(np.float32)
    if 'Rough' in maps:
        r = _sample(_prefilter(maps['Rough'], maps['Rough'].shape[1] / max(px_per_tile, 1)), tu, tv)[..., 0]
        out['R'] = (r / max(float(r.mean()), 1e-3)).astype(np.float32)
    else:
        out['R'] = np.ones((S, S), np.float32)
    out['H'] = (0.5 + 0.0 * A).astype(np.float32)
    print(f'photo {sp.name} <- {sp.photo}: {rep_u:.1f} repeats over the atlas, {px_per_tile:.0f} px per scan tile')
    return out


def uv_unit_metres(obj):
    me = obj.data
    uv = me.uv_layers.active.data
    a3 = auv = 0.0
    for p in me.polygons:
        a3 += p.area
        pts = [uv[i].uv for i in p.loop_indices]
        s = 0.0
        for k in range(len(pts)):
            x1, y1 = pts[k]; x2, y2 = pts[(k + 1) % len(pts)]
            s += x1 * y2 - x2 * y1
        auv += abs(s) / 2
    return math.sqrt(a3 / max(auv, 1e-9)) * M_PER_UNIT


# ----------------------------------------------------------------------------- unwrap + bake
def unwrap(obj, margin=0.003, angle=66.0):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=margin, area_weight=0.0, correct_aspect=True,
                             scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(margin=margin, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')


def _setup_scene(samples):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'
    sc.render.bake.margin = 14
    sc.render.bake.margin_type = 'EXTEND'
    sc.render.bake.use_clear = True
    if sc.world is None:
        sc.world = bpy.data.worlds.new('bakeworld')
    sc.world.light_settings.distance = 0.7


def _bake_materials(obj, mode, img):
    for i, slot in enumerate(obj.material_slots):
        m = bpy.data.materials.new(f'bk_{mode}_{i}')
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        em = nt.nodes.new('ShaderNodeEmission')
        if mode == 'id':
            em.inputs['Color'].default_value = (i / 32.0, 0, 0, 1)
        elif mode == 'vcol':
            at = nt.nodes.new('ShaderNodeAttribute')
            at.attribute_name = 'Col'
            nt.links.new(at.outputs['Color'], em.inputs['Color'])
        else:
            em.inputs['Color'].default_value = (0.5, 0.5, 0.5, 1)
        tx = nt.nodes.new('ShaderNodeTexImage')
        tx.image = img
        tx.select = True
        nt.nodes.active = tx
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
        slot.material = m


def _bake(obj, name, S, mode, bake_type, samples):
    img = bpy.data.images.new(f'bake_{name}_{mode}', S, S, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color'
    _bake_materials(obj, mode, img)
    _setup_scene(samples)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type=bake_type)
    buf = np.empty(S * S * 4, np.float32)
    img.pixels.foreach_get(buf)
    return buf.reshape(S, S, 4)[..., :3].copy()


def _blur3(a):
    a = 0.25 * np.roll(a, 1, 0) + 0.5 * a + 0.25 * np.roll(a, -1, 0)
    return 0.25 * np.roll(a, 1, 1) + 0.5 * a + 0.25 * np.roll(a, -1, 1)


def bake_asset(obj, specs, name, S=1024, out_dir=None, ao_samples=160, ao_blur=1, seed=0, detail_scale=1.0):
    """Unwrap, bake and compose. Returns dict(paths..., factors) and leaves bake materials in the slots (call finalize next).
    specs must be ordered like obj.material_slots."""
    assert len(specs) == len(obj.material_slots) <= 32
    out_dir = out_dir or os.path.dirname(bpy.data.filepath) or '.'
    os.makedirs(out_dir, exist_ok=True)
    unwrap(obj)
    ao = _bake(obj, name, S, 'ao', 'AO', ao_samples)[..., 0]
    idm = _bake(obj, name, S, 'id', 'EMIT', 1)[..., 0]
    vc = _bake(obj, name, S, 'vcol', 'EMIT', 1)
    ids = np.clip(np.round(idm * 32.0), 0, len(specs) - 1).astype(int)
    if ao_blur:
        for _ in range(ao_blur):
            ao = _blur3(ao)
    ao = np.clip(ao, 0, 1)

    uvm = uv_unit_metres(obj)
    H = np.zeros((S, S), np.float32); A = np.zeros((S, S), np.float32); R = np.ones((S, S), np.float32)
    A3 = np.ones((S, S, 3), np.float32); NP = np.zeros((S, S, 3), np.float32); pmask = np.zeros((S, S), bool)
    bump = np.zeros((S, S), np.float32); rough = np.zeros((S, S), np.float32); metal = np.zeros((S, S), np.float32)
    aoa = np.zeros((S, S), np.float32); aos = np.zeros((S, S), np.float32)
    vmask = np.zeros((S, S), bool)
    for i, sp in enumerate(specs):
        m = ids == i
        if not m.any():
            continue
        if sp.flat:
            d = dict(H=np.full((S, S), 0.5, np.float32), A=np.full((S, S), 0.95, np.float32), R=np.ones((S, S), np.float32))
        elif sp.photo:
            d = photo_detail(sp, S, uvm)
            if sp.overlay:
                o = detail.make(sp.overlay, S, seed=seed + 11 * i + 5)
                d['A3'] = d['A3'] * (o['A3'] if 'A3' in o else o['A'][..., None])
                d['R'] = d['R'] * o['R']
                d['H'] = o['H']
            n = (d['N'] * 2 - 1) * np.array([sp.bump, sp.bump, 1.0], np.float32)
            n /= np.linalg.norm(n, axis=-1, keepdims=True)
            NP[m] = (n * 0.5 + 0.5)[m]
            pmask[m] = True
        else:
            p = dict(sp.params)
            if detail_scale != 1.0 and 'pitch' in p:
                p['pitch'] = max(2, int(round(p['pitch'] * detail_scale)))
            d = detail.make(sp.kind, S, seed=seed + 11 * i + 1, **p)
        H[m] = d['H'][m]
        A[m] = np.clip(d['A'][m] / max(float(np.percentile(d['A'][m], 97)), 1e-3), 0, 1)   # brightest texels = 1 so baseColorFactor can reach the target colour
        if 'A3' in d:
            a3 = d['A3'][m]
            A3[m] = np.clip(a3 / max(float(np.percentile(a3.mean(-1), 97)), 1e-3), 0, 1)
        else:
            A3[m] = A[m][:, None]
        rough[m] = np.clip(sp.rough * d['R'][m], 0.04, 1.0)
        metal[m] = sp.metal
        bump[m] = sp.bump
        aoa[m] = sp.ao_albedo
        aos[m] = sp.ao_strength
        vmask[m] = sp.vcol
    occl = 1.0 - aos * (1.0 - ao)
    base = A3 * (1.0 - aoa[..., None] * (1.0 - ao[..., None]))
    vsrgb = lin_to_srgb(vc)
    base = np.where(vmask[..., None], vsrgb * (0.75 + 0.25 * A[..., None]) * (1.0 - aoa[..., None] * (1.0 - ao[..., None])), base)
    orm = np.stack([occl, rough, metal], axis=-1)
    nrm = detail.height_to_normal(H, bump)
    nrm = np.where(pmask[..., None], NP, nrm)
    if pmask.any():
        # photo masks may also carry an overlay height: add its slope on top
        pass
    paths = {}
    for key, arr in (('basecolor', base), ('orm', orm), ('normal', nrm)):
        p = os.path.join(out_dir, f'{name}_{key}.png')
        write_png(p, _to_u8(arr[::-1]))
        paths[key] = p
    # per material colour factors: normalise by the mean linear modulation of that material's texels
    factors = {}
    lin_base = srgb_to_lin(base)
    for i, sp in enumerate(specs):
        m = ids == i
        if sp.vcol or not m.any():
            factors[sp.name] = (1.0, 1.0, 1.0)
            continue
        mean = float(lin_base[m].mean())
        f = np.array([c / max(mean, 1e-4) for c in sp.color])
        if f.max() > 1.0:
            f = f / f.max()          # keep the hue, give up a little brightness
        factors[sp.name] = tuple(float(x) for x in f)
    # debug atlas previews
    for key, arr in (('_dbg_ao', np.repeat(ao[..., None], 3, 2)), ('_dbg_id', np.repeat(idm[..., None], 3, 2) * 8)):
        write_png(os.path.join(out_dir, f'{name}{key}.png'), _to_u8(arr[::-1]))
    return dict(paths=paths, factors=factors, ids=ids, size=S)


# ----------------------------------------------------------------------------- final materials
def _occlusion_group():
    g = bpy.data.node_groups.get('glTF Material Output')
    if g is None:
        g = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        g.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    return g


def make_final_material(spec, baked):
    m = bpy.data.materials.new(spec.name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    bsdf.inputs['Metallic'].default_value = spec.metal
    bsdf.inputs['Roughness'].default_value = spec.rough
    P = baked['paths']

    def img(key, cs):
        i = bpy.data.images.load(P[key], check_existing=True)
        i.colorspace_settings.name = cs
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = i
        n.interpolation = 'Linear'
        return n
    tb = img('basecolor', 'sRGB')
    fac = baked['factors'][spec.name]
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    nt.links.new(tb.outputs['Color'], mix.inputs[6])
    mix.inputs[7].default_value = (*fac, 1.0)
    nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
    to = img('orm', 'Non-Color')
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(to.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    grp = nt.nodes.new('ShaderNodeGroup')
    grp.node_tree = _occlusion_group()
    nt.links.new(sep.outputs['Red'], grp.inputs['Occlusion'])
    tn = img('normal', 'Non-Color')
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    if spec.emissive is not None:
        bsdf.inputs['Emission Color'].default_value = (*spec.emissive, 1.0)
        bsdf.inputs['Emission Strength'].default_value = spec.emissive_strength
    if spec.sheen > 0:
        bsdf.inputs['Sheen Weight'].default_value = spec.sheen
        bsdf.inputs['Sheen Roughness'].default_value = spec.sheen_rough
        bsdf.inputs['Sheen Tint'].default_value = (*[min(1.0, c * 1.4 + 0.15) for c in spec.color], 1.0)
    if spec.coat > 0:
        bsdf.inputs['Coat Weight'].default_value = spec.coat
        bsdf.inputs['Coat Roughness'].default_value = spec.coat_rough
    m.use_backface_culling = not spec.double_sided
    return m


def finalize(obj, specs, baked, drop_col=True):
    for i, sp in enumerate(specs):
        obj.material_slots[i].material = make_final_material(sp, baked)
    if drop_col and 'Col' in obj.data.color_attributes:
        obj.data.color_attributes.remove(obj.data.color_attributes['Col'])
    for m in [m for m in bpy.data.materials if m.name.startswith('bk_')]:
        bpy.data.materials.remove(m)
    for im in [im for im in bpy.data.images if im.name.startswith('bake_')]:
        bpy.data.images.remove(im)

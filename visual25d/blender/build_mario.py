"""Build out/mario.glb: rigged, textured, animated Mario (procedural; Blender 4.5 headless).
Run:  visual25d/blender/run.sh visual25d/blender/build_mario.py [-- --size 1024 --no-clips]
Authoring axes: faces +X, up +Z, camera side -Y (exported Y-up: faces +X, +Z toward the viewer).
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
import numpy as np

from lib import asset, bake, geo, rig
from lib.geo import Part, chain_weights, ellipsoid, ellipsoid_normal, ellipsoid_point, frame_from_z, lathe, rounded_disc, sphere, \
    surface_patch, surf_path, tube, grid_solid, poly_prism, smoothstep
from lib.bake import MatSpec, hexlin

OUT = os.path.join(HERE, 'out')
SIZE = int(sys.argv[sys.argv.index('--size') + 1]) if '--size' in sys.argv else 2048
DO_CLIPS = '--no-clips' not in sys.argv

from mario_skel import *

# ----------------------------------------------------------------------------- palette / materials
SPECS = [   # film-quality PBR in saturated iconic colours: Poly Haven CC0 scans at true size (ATTRIBUTION.md) + procedural skin/hair/brass
    MatSpec('M_Cloth_Primary', hexlin('#E01B24'), rough=0.82, photo='denim_fabric', photo_scale=1.6, bump=2.0, contrast=0.35, sheen=0.4, sheen_rough=0.5),
    MatSpec('M_Cloth_Secondary', hexlin('#1D50DA'), rough=0.85, photo='denim_fabric', photo_scale=1.25, bump=1.8, contrast=0.55, sheen=0.25),
    MatSpec('M_Skin', hexlin('#F7B088'), rough=0.45, kind='skin_real', bump=0.7, ao_albedo=0.08),
    MatSpec('M_Hair', hexlin('#4E2710'), rough=0.42, kind='hair_fine', bump=3.5),
    MatSpec('M_Glove', hexlin('#F7F6F2'), rough=0.88, photo='cotton_jersey', bump=1.6, contrast=0.5, sheen=0.3),
    MatSpec('M_Shoe', hexlin('#7A3B16'), rough=0.40, photo='brown_leather', bump=1.2, chroma=0.15, contrast=0.6),
    MatSpec('M_Button', hexlin('#F5BE2E'), rough=0.24, metal=1.0, kind='worn_gold', bump=0.6),
    MatSpec('M_Eye', (1, 1, 1), rough=0.04, kind='smooth', vcol=True, bump=0.1, ao_albedo=0.1, coat=1.0, coat_rough=0.02),
    MatSpec('M_Emblem', hexlin('#FAFAF6'), rough=0.82, photo='denim_fabric', photo_scale=1.6, bump=1.0, contrast=0.2, sheen=0.3),
]
MAT_ORDER = [s.name for s in SPECS]
EYE_WHITE, EYE_IRIS, EYE_PUPIL, EYE_GLINT = (0.82, 0.84, 0.90), (0.02, 0.16, 0.85), (0.004, 0.004, 0.012), (1.0, 1.0, 1.0)

# head / cap parameters
HC, HR = (0.01, 0.0, 1.50), (0.345, 0.335, 0.325)      # head centre / radii
HN, HNZ = 2.5, 2.2                                      # head squareness (xy, z)
CC, CR = (-0.01, 0.0, 1.70), (0.395, 0.385, 0.30)       # cap dome centre / radii
CN, CNZ = 2.3, 2.0


def P(*a, **k):
    return Part(*a, **k)


def make_parts():
    parts = []
    add = parts.append

    # ---- torso ---------------------------------------------------------------------------------------------------
    tw = chain_weights([('Hips', (0, 0, 0.80)), ('Spine', (0, 0, 0.95))], width=0.34)
    add(ellipsoid('shirt', (-0.01, 0, 1.04), (0.285, 0.305, 0.275), 'M_Cloth_Primary', nu=32, nv=20, n=2.3, weights=tw))
    add(ellipsoid('overalls', (0.03, 0, 0.925), (0.335, 0.340, 0.315), 'M_Cloth_Secondary', nu=36, nv=22, n=2.4, nz=2.2, weights=tw))
    add(ellipsoid('neck', (0.0, 0, 1.26), (0.13, 0.13, 0.10), 'M_Skin', nu=16, nv=8, bone='Head'))
    # shoulder straps (flat tubes riding over the shirt) + gold buttons
    for sg in (1, -1):
        path = surf_path((-0.01, 0, 1.04), (0.285, 0.305, 0.275),
                         [(32 * sg, 28, 0.0), (28 * sg, 44, 0.012), (24 * sg, 62, 0.014), (0 * sg + 18 * sg, 80, 0.012),
                          (130 * sg, 66, 0.012), (150 * sg, 40, 0.012), (160 * sg, 10, 0.012)], n=2.3)
        add(tube('strap', path, np.array([[0.050, 0.016]] * len(path)), nu=10, mat='M_Cloth_Secondary', caps=(2, 2),
                 up=(0, 0, 1), bone='Spine'))
    # buttons: where the straps meet the bib
    for sg in (1, -1):
        p0 = ellipsoid_point((-0.01, 0, 1.04), (0.285, 0.305, 0.275), 31 * sg, 27, 2.3) + np.array([0.012, 0, 0.0])
        nrm = ellipsoid_normal((0.285, 0.305, 0.275), 31 * sg, 27, 2.3)
        add(rounded_disc('button', 0.048, 0.030, 0.011, nu=16, steps=3, mat='M_Button', domed=0.012, bone='Spine').aim(p0 + nrm * 0.01, nrm))

    # ---- legs (overall trousers) + shoes ------------------------------------------------------------------------
    for sg, s in ((1, '.L'),):
        lw = chain_weights([('Thigh' + s, (0, sg * LEG_Y, HIP_Z)), ('Shin' + s, (0, sg * LEG_Y, KNEE_Z))], width=0.14)
        lp = np.array([[0, sg * LEG_Y, 0.80], [0.005, sg * LEG_Y, 0.62], [0.012, sg * LEG_Y, 0.44], [0.005, sg * LEG_Y, 0.31],
                       [0.0, sg * LEG_Y, 0.215]])
        add(tube('leg' + s, lp, np.array([0.158, 0.150, 0.138, 0.128, 0.134]), nu=20, mat='M_Cloth_Secondary', caps=(4, 3), weights=lw))
        # cuff of the trouser leg
        add(lathe('cuff' + s, [(0.118, -0.03), (0.140, -0.012), (0.146, 0.012), (0.138, 0.030), (0.118, 0.034)], 22, 'M_Cloth_Secondary',
                  cap=False, bone='Shin' + s).place((0.0, sg * LEG_Y, 0.235)))
        # shoe
        add(ellipsoid('shoe' + s, (0.115, sg * LEG_Y, 0.105), (0.300, 0.150, 0.118), 'M_Shoe', nu=24, nv=14, n=2.6, nz=2.3, bone='Foot' + s))
        add(ellipsoid('toe' + s, (0.285, sg * LEG_Y, 0.098), (0.150, 0.142, 0.100), 'M_Shoe', nu=20, nv=12, n=2.3, bone='Foot' + s))
        add(ellipsoid('ankle' + s, (0.0, sg * LEG_Y, 0.200), (0.118, 0.118, 0.085), 'M_Shoe', nu=16, nv=8, bone='Foot' + s))
        add(ellipsoid('sole' + s, (0.125, sg * LEG_Y, 0.028), (0.318, 0.158, 0.040), 'M_Shoe', nu=24, nv=8, n=2.8, nz=2.0, bone='Foot' + s))

    # ---- arms: red sleeves + white gloves ------------------------------------------------------------------------
    sg, s = 1, '.L'
    aw = chain_weights([('UpperArm' + s, S_ARM), ('Forearm' + s, E_ARM)], width=0.16)
    ap = np.array([[0.0, 0.352, 1.15], S_ARM, [0.0, 0.40, 1.00], E_ARM, [0.035, 0.445, 0.79], [0.06, 0.457, 0.71]])
    add(tube('sleeve' + s, ap, np.array([0.118, 0.117, 0.108, 0.104, 0.100, 0.100]), nu=18, mat='M_Cloth_Primary', caps=(4, 2), weights=aw))
    fd = np.array(H_ARM) - np.array(W_ARM)
    fd /= np.linalg.norm(fd)
    add(lathe('cuffg' + s, [(0.098, -0.035), (0.120, -0.018), (0.128, 0.008), (0.120, 0.030), (0.098, 0.040)], 22, 'M_Glove', cap=False,
              bone='Forearm' + s).aim(np.array(W_ARM) + fd * 0.005, fd))
    # hand: mitten with thumb and finger bumps
    hc = np.array(W_ARM) + fd * 0.085
    add(ellipsoid('palm' + s, hc, (0.108, 0.098, 0.125), 'M_Glove', nu=22, nv=14, bone='Hand' + s, rot=(0, 8, 0)))
    for k, (dx, dz, r) in enumerate([(0.060, -0.075, 0.046), (0.075, -0.030, 0.050), (0.075, 0.015, 0.050), (0.055, 0.058, 0.044)]):
        add(ellipsoid(f'finger{k}' + s, hc + np.array([dx, 0.030, dz]) - np.array([0.0, 0.0, 0.0]), (0.045, 0.040, r * 0.85), 'M_Glove',
                      nu=14, nv=8, bone='Hand' + s))
    add(tube('thumb' + s, np.array([hc + [0.02, -0.075, 0.035], hc + [0.085, -0.075, 0.062], hc + [0.130, -0.065, 0.090]]),
             np.array([0.042, 0.040, 0.034]), nu=12, mat='M_Glove', caps=(3, 4), bone='Hand' + s))

    # ---- head ----------------------------------------------------------------------------------------------------
    head = ellipsoid('head', HC, HR, 'M_Skin', nu=44, nv=30, n=HN, nz=HNZ, bone='Head')

    def jowl(V):                         # fuller lower face, slightly pushed forward muzzle, tapering chin
        V = V.copy()
        w = np.clip((HC[2] - V[:, 2]) / HR[2], -1, 1)
        low = np.clip(w, 0, 1)
        V[:, 1] *= 1 + 0.07 * low ** 1.2
        V[:, 0] += 0.02 * low * (V[:, 0] > 0)
        chin = np.clip((w - 0.55) / 0.45, 0, 1)
        V[:, 1] *= 1 - 0.18 * chin ** 1.5
        V[:, 0] *= 1 - 0.08 * chin ** 1.5
        return V
    head.deform(jowl)
    add(head)
    for sg in (1, -1):
        add(ellipsoid('cheek', (0.215, sg * 0.135, 1.385), (0.160, 0.140, 0.120), 'M_Skin', nu=20, nv=12, bone='Head'))
        # ears: shallow dish with a thick rim, facing outward
        ear = lathe('ear', [(0.0, 0.0), (0.040, -0.004), (0.070, 0.006), (0.086, 0.026), (0.094, 0.046), (0.086, 0.060), (0.066, 0.056),
                            (0.040, 0.036), (0.0, 0.030)], 18, 'M_Skin', cap=False, bone='Head')
        ear.xf(frame_from_z((0, sg, 0.0), up=(0, 0, 1)) @ np.diag([0.92, 1.0, 1.0]) , (-0.010, sg * 0.318, 1.50), (1.0, 1.0, 1.0))
        add(ear)
        add(ellipsoid('earback', (-0.012, sg * 0.318, 1.498), (0.080, 0.036, 0.098), 'M_Skin', nu=16, nv=10, bone='Head'))
    # nose + moustache
    add(ellipsoid('nose', (0.392, 0, 1.455), (0.135, 0.120, 0.112), 'M_Skin', nu=26, nv=16, bone='Head', rot=(0, 8, 0)))
    add(ellipsoid('bridge', (0.34, 0, 1.52), (0.085, 0.065, 0.095), 'M_Skin', nu=16, nv=10, bone='Head'))
    for sg in (1, -1):
        path = np.array([[0.405, sg * 0.030, 1.372], [0.390, sg * 0.105, 1.360], [0.340, sg * 0.185, 1.360], [0.270, sg * 0.245, 1.380],
                         [0.205, sg * 0.292, 1.415]])
        add(tube('stache', path, np.array([[0.060, 0.066], [0.062, 0.070], [0.056, 0.064], [0.046, 0.052], [0.030, 0.034]]), nu=14,
                 mat='M_Hair', caps=(4, 4), up=(0, 0, 1), bone='Head'))
    # eyes (sclera, iris, pupil, glint) - one material, colour from vertex colour
    for sg in (1, -1):
        ey, ez = sg * 0.125, 1.545
        ex = 0.312
        add(ellipsoid('eye', (ex, ey, ez), (0.050, 0.064, 0.088), 'M_Eye', nu=18, nv=12, bone='Head', col=EYE_WHITE))
        add(ellipsoid('iris', (ex + 0.020, ey + sg * -0.004, ez - 0.004), (0.036, 0.046, 0.068), 'M_Eye', nu=14, nv=10, bone='Head', col=EYE_IRIS))
        add(ellipsoid('pupil', (ex + 0.034, ey + sg * -0.004, ez - 0.006), (0.024, 0.027, 0.045), 'M_Eye', nu=12, nv=8, bone='Head', col=EYE_PUPIL))
        add(ellipsoid('glint', (ex + 0.047, ey + sg * 0.004, ez + 0.026), (0.010, 0.012, 0.016), 'M_Eye', nu=8, nv=5, bone='Head', col=EYE_GLINT))
        # eyebrow
        bp = np.array([[0.322, sg * 0.060, 1.662], [0.318, sg * 0.125, 1.680], [0.296, sg * 0.188, 1.665]])
        add(tube('brow', bp, np.array([[0.020, 0.026], [0.022, 0.030], [0.016, 0.020]]), nu=10, mat='M_Hair', caps=(3, 3), bone='Head'))
    # hair: round clumps (no flat patches): back, nape, behind the ear and bushy sideburns
    add(ellipsoid('hair_back', (-0.150, 0, 1.470), (0.215, 0.318, 0.185), 'M_Hair', nu=26, nv=16, n=2.3, bone='Head'))
    add(ellipsoid('nape', (-0.215, 0, 1.360), (0.135, 0.225, 0.105), 'M_Hair', nu=20, nv=12, bone='Head'))
    for sg in (1, -1):
        add(ellipsoid('curl', (-0.125, sg * 0.255, 1.440), (0.140, 0.085, 0.140), 'M_Hair', nu=18, nv=12, bone='Head'))
        add(ellipsoid('sideburn', (0.085, sg * 0.295, 1.515), (0.070, 0.052, 0.125), 'M_Hair', nu=16, nv=10, bone='Head', rot=(0, -10, 0)))

    # ---- cap -----------------------------------------------------------------------------------------------------
    nu, nv = 48, 15
    az = np.linspace(-180, 180, nu, endpoint=False)
    el0 = -24 + 30 * smoothstep(-0.2, 1.0, np.cos(np.radians(az)))      # lower at the sides / back, higher at the front
    v = np.linspace(0, 1, nv)[:, None]
    EL = el0[None, :] + (87.0 - el0[None, :]) * v
    AZ = np.broadcast_to(az[None, :], EL.shape)
    out = ellipsoid_point(CC, CR, AZ, EL, CN, CNZ)
    nrm = ellipsoid_normal(CR, AZ, EL, CN, CNZ)
    add(geo.lip_shell(out, 3, 0.034, nrm, True, 'dome', 'M_Cloth_Primary', bone='Head'))
    # visor
    brim = ellipsoid('brim', (0.415, 0, 1.718), (0.290, 0.272, 0.034), 'M_Cloth_Primary', nu=36, nv=14, n=2.5, nz=2.0, bone='Head')

    def bend(V):
        V = V.copy()
        dx = np.clip(V[:, 0] - 0.30, 0, None)
        V[:, 2] -= 0.55 * dx ** 1.6 + 0.05 * (V[:, 1] / 0.27) ** 2 * (V[:, 0] > 0.3)
        return V
    brim.deform(bend)
    add(brim)
    add(sphere('capbutton', (CC[0] + 0.0, 0, CC[2] + CR[2] - 0.006), 0.034, 'M_Cloth_Primary', nu=14, nv=8, bone='Head'))
    # emblem: white disc + red M standing on the dome front
    el_e = 27.0
    pe = ellipsoid_point(CC, CR, 0, el_e, CN, CNZ)
    ne = ellipsoid_normal(CR, 0, el_e, CN, CNZ)
    add(rounded_disc('emblem', 0.106, 0.018, 0.007, nu=32, steps=3, mat='M_Emblem', domed=0.003, bone='Head').aim(pe + ne * 0.002, ne))
    mpoly = [(-0.060, -0.045), (-0.040, -0.045), (-0.040, 0.012), (-0.013, -0.032), (0.013, -0.032), (0.040, 0.012), (0.040, -0.045),
             (0.060, -0.045), (0.060, 0.048), (0.036, 0.048), (0.000, -0.008), (-0.036, 0.048), (-0.060, 0.048)]
    m = poly_prism('M', mpoly, 0.012, bevel=0.003, mat='M_Cloth_Primary', bone='Head', sharp=40)
    m.xf(frame_from_z(ne) * 1.1, pe + ne * 0.014)
    add(m)

    # mirror left-only parts
    full = []
    for p in parts:
        full.append(p)
        if p.name.endswith('.L'):
            full.append(p.mirrored('.R', LR))
    return full


# ----------------------------------------------------------------------------- chibi morph
def chibi_offsets(obj, W):
    """Per-vertex morph target for small Mario (same skeleton): big head, short torso and limbs. Blend of per-bone affine maps."""
    V = np.array([v.co[:] for v in obj.data.vertices])
    n = len(V)
    P2 = np.zeros_like(V)
    names = BONE_NAMES

    def torso(p):
        q = p.copy()
        q[:, 2] = 0.58 + (p[:, 2] - 0.80) * 0.62
        q[:, 0] *= 1.06; q[:, 1] *= 1.06
        return q

    def head(p):
        piv, tgt = np.array([0, 0, 1.27]), np.array([0, 0, 0.86])
        return tgt + (p - piv) * np.array([1.30, 1.36, 1.38])

    def leg(p):
        q = p.copy()
        sg = np.sign(p[:, 1] + 1e-9)
        q[:, 1] = sg * (LEG_Y * 0.95) + (p[:, 1] - sg * LEG_Y) * 1.16
        q[:, 0] = p[:, 0] * 1.16
        q[:, 2] = p[:, 2] * 0.72
        return q

    def arm(p):
        sg = np.sign(p[:, 1] + 1e-9)
        q = p.copy()
        shp = np.stack([np.zeros(len(p)), sg * SH_Y * 0.98, np.full(len(p), 0.58 + (1.14 - 0.80) * 0.62)], axis=1)
        sh0 = np.stack([np.zeros(len(p)), sg * SH_Y, np.full(len(p), 1.14)], axis=1)
        return shp + (p - sh0) * 0.82

    maps = {}
    for b in names:
        if b in ('Root', 'Hips', 'Spine'):
            maps[b] = torso
        elif b == 'Head':
            maps[b] = head
        elif b.startswith(('Thigh', 'Shin', 'Foot')):
            maps[b] = leg
        else:
            maps[b] = arm
    for i, b in enumerate(names):
        w = W[:, i]
        if w.max() < 1e-6:
            continue
        P2 += w[:, None] * maps[b](V)
    wsum = W.sum(1)
    P2[wsum < 1e-6] = V[wsum < 1e-6]
    return P2 - V


# ----------------------------------------------------------------------------- main
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig.set_fps()
    parts = make_parts()
    arm = rig.make_armature('Mario_Armature', bones())
    obj, W = geo.assemble(parts, 'Mario', MAT_ORDER, bones=BONE_NAMES)
    rig.skin_to(obj, arm)
    tris = sum(p.tri_count() for p in parts)
    print('parts', len(parts), 'tris', tris)
    import collections
    c = collections.Counter()
    for p in parts:
        c[p.name.split('.')[0]] += p.tri_count()
    print(sorted(c.items(), key=lambda kv: -kv[1])[:14])
    res = bake.bake_asset(obj, SPECS, 'mario', SIZE, os.path.join(asset.CACHE, 'mario'), ao_samples=256, seed=3)
    bake.finalize(obj, SPECS, res)
    obj.shape_key_add(name='Basis')
    sk = obj.shape_key_add(name='Chibi')
    off = chibi_offsets(obj, W)
    for i, v in enumerate(obj.data.vertices):
        sk.data[i].co = v.co + type(v.co)(off[i])
    sk.value = 0.0
    if DO_CLIPS:
        import mario_clips
        mario_clips.add_clips(arm)
    os.makedirs(OUT, exist_ok=True)
    rig.export_glb(os.path.join(OUT, 'mario.glb'), [arm, obj])
    print('exported', os.path.join(OUT, 'mario.glb'))


if __name__ == '__main__':
    build()

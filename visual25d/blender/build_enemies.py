"""Build out/goomba.glb, out/koopa.glb (+Wings with clip fly), out/koopa_shell.glb.
Run: visual25d/blender/run.sh visual25d/blender/build_enemies.py
Authoring axes as the contract: faces +X, up +Z, camera side -Y."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
from lib import asset, geo, rig
from lib.geo import ellipsoid, sphere, tube, lathe, frame_from_z
from lib.bake import MatSpec, hexlin

WHITE, BLACK = (0.85, 0.86, 0.88), (0.004, 0.004, 0.01)
EYE = lambda: MatSpec('M_Eye', (1, 1, 1), rough=0.12, kind='smooth', vcol=True, bump=0.1, ao_albedo=0.1)


def eyes(parts, x, y, z, r, bone, pupil_dx=0.03, scale=1.0):
    for sg in (1, -1):
        parts.append(ellipsoid('eye', (x, sg * y, z), (r * 0.55, r * 0.8, r * 1.05), 'M_Eye', nu=16, nv=10, bone=bone, col=WHITE))
        parts.append(ellipsoid('pupil', (x + pupil_dx, sg * (y - 0.012), z - 0.005), (r * 0.34, r * 0.42, r * 0.72), 'M_Eye', nu=12, nv=8, bone=bone, col=BLACK))


# ------------------------------------------------------------------ Goomba
def goomba():
    P = []
    P.append(ellipsoid('head', (0.0, 0, 0.63), (0.50, 0.50, 0.38), 'M_Head', nu=36, nv=22, n=2.3, nz=2.1, bone='Body'))
    P.append(ellipsoid('stem', (0.02, 0, 0.30), (0.27, 0.27, 0.23), 'M_Stem', nu=24, nv=12, bone='Body'))
    P.append(ellipsoid('lip', (0.0, 0, 0.40), (0.30, 0.30, 0.05), 'M_Stem', nu=24, nv=8, bone='Body'))
    eyes(P, 0.43, 0.16, 0.58, 0.14, 'Body', 0.035)
    for sg in (1, -1):
        P.append(tube('brow', np.array([[0.50, sg * 0.03, 0.665], [0.47, sg * 0.16, 0.735], [0.39, sg * 0.30, 0.80]]),
                      np.array([[0.035, 0.045], [0.042, 0.05], [0.03, 0.04]]), nu=10, mat='M_Brow', caps=(3, 3), bone='Body'))
        f = lathe('fang', [(0.0, 0.0), (0.035, 0.0), (0.005, 0.07), (0.0, 0.075)], 10, 'M_Eye', cap=True, bone='Body', col=WHITE)
        f.xf(geo.rot_xyz(180, 0, 0), (0.30, sg * 0.10, 0.40))
        P.append(f)
    for sg, s in ((1, '.L'), (-1, '.R')):
        P.append(ellipsoid('foot' + s, (0.07, sg * 0.20, 0.085), (0.21, 0.15, 0.09), 'M_Feet', nu=20, nv=10, n=2.4, bone='Foot' + s))
    specs = [MatSpec('M_Head', hexlin('#A8581E'), rough=0.62, kind='fur', bump=1.6), MatSpec('M_Stem', hexlin('#F1D2A0'), rough=0.6, kind='skin', bump=0.8),
             MatSpec('M_Brow', hexlin('#2A1608'), rough=0.6, kind='hair', bump=2), EYE(),
             MatSpec('M_Feet', hexlin('#3A2010'), rough=0.5, kind='grain', bump=1.5)]
    bones = [('Root', None, (0, 0, 0), (0, 0, 0.1)), ('Body', 'Root', (0, 0, 0.2), (0, 0, 0.9)),
             ('Foot.L', 'Root', (0.07, 0.2, 0.1), (0.2, 0.2, 0.05)), ('Foot.R', 'Root', (0.07, -0.2, 0.1), (0.2, -0.2, 0.05))]

    def clips(arm):
        R = rig.Rig(arm, loc_bones=('Root', 'Body', 'Foot.L', 'Foot.R'))
        def walk(t):
            p = 2 * math.pi * t
            for s, ph in ((  'L', 0.0), ('R', math.pi)):
                R.L('Foot.' + s, 0.14 * math.cos(p + ph), 0, 0.09 * max(0.0, -math.sin(p + ph)))
                R.R('Foot.' + s, ry=-18 * max(0.0, -math.sin(p + ph)) * 0 + 10 * math.sin(p + ph))
            R.L('Body', 0, 0, 0.025 * abs(math.sin(p)))
            R.R('Body', rx=5 * math.sin(p), ry=2 * math.cos(2 * p), rz=4 * math.sin(p))
        def idle(t):
            p = 2 * math.pi * t
            R.L('Body', 0, 0, 0.012 * math.sin(p))
            R.R('Body', rx=2 * math.sin(p), rz=2 * math.sin(p + 1))
        R.clip('walk', 60, walk); R.clip('idle', 90, idle)
        return dict(walk=1.0, idle=1.5)
    return asset.build('goomba', P, specs, bones, 512, clips, seed=5)


# ------------------------------------------------------------------ Koopa
KSKIN = '#F2C24A'
def koopa_specs():
    return [MatSpec('M_Shell', hexlin('#2FA52F'), rough=0.38, kind='shell', bump=1.8), MatSpec('M_Belly', hexlin('#F4E3A8'), rough=0.55, kind='shell', bump=1.2),
            MatSpec('M_Skin', hexlin(KSKIN), rough=0.55, kind='skin', bump=1.0), MatSpec('M_Shoe', hexlin('#E86A1C'), rough=0.5, kind='grain', bump=1.4),
            MatSpec('M_Hair', hexlin('#3C6E1A'), rough=0.6, kind='smooth'), EYE()]


def koopa():
    P = []
    P.append(ellipsoid('shell', (-0.14, 0, 0.80), (0.40, 0.44, 0.46), 'M_Shell', nu=32, nv=20, n=2.3, bone='Hips', rot=(0, -8, 0)))
    P.append(ellipsoid('belly', (0.06, 0, 0.74), (0.31, 0.36, 0.40), 'M_Belly', nu=28, nv=16, bone='Hips'))
    P.append(ellipsoid('rim', (-0.12, 0, 0.45), (0.45, 0.47, 0.07), 'M_Belly', nu=28, nv=8, n=2.4, bone='Hips'))
    P.append(ellipsoid('torso', (0.08, 0, 0.78), (0.22, 0.30, 0.34), 'M_Skin', nu=20, nv=12, bone='Hips'))
    P.append(tube('neck', np.array([[0.12, 0, 1.0], [0.2, 0, 1.12], [0.26, 0, 1.24]]), np.array([0.12, 0.11, 0.11]), nu=14, mat='M_Skin', caps=(3, 2), bone='Head'))
    P.append(ellipsoid('head', (0.30, 0, 1.31), (0.23, 0.20, 0.21), 'M_Skin', nu=22, nv=14, bone='Head'))
    P.append(ellipsoid('snout', (0.46, 0, 1.24), (0.14, 0.12, 0.09), 'M_Skin', nu=16, nv=10, bone='Head'))
    P.append(ellipsoid('nostril', (0.58, 0, 1.27), (0.02, 0.03, 0.02), 'M_Hair', nu=8, nv=6, bone='Head'))
    eyes(P, 0.44, 0.10, 1.38, 0.115, 'Head', 0.03)
    for sg, s in ((1, '.L'), (-1, '.R')):
        P.append(tube('brow', np.array([[0.47, sg * 0.04, 1.50], [0.44, sg * 0.17, 1.52]]), np.array([[0.02, 0.025]] * 2), nu=8, mat='M_Hair', caps=(2, 2), bone='Head'))
        P.append(tube('arm' + s, np.array([[0.14, sg * 0.30, 0.90], [0.26, sg * 0.34, 0.74]]), np.array([0.07, 0.065]), nu=12, mat='M_Skin', caps=(3, 3), bone='Arm' + s))
        P.append(tube('leg' + s, np.array([[0.02, sg * 0.18, 0.55], [0.04, sg * 0.18, 0.2]]), np.array([0.11, 0.10]), nu=12, mat='M_Skin', caps=(3, 2), bone='Leg' + s))
        P.append(ellipsoid('shoe' + s, (0.12, sg * 0.18, 0.09), (0.23, 0.15, 0.10), 'M_Shoe', nu=20, nv=10, n=2.4, bone='Leg' + s))
        P.append(ellipsoid('shoetip' + s, (0.24, sg * 0.18, 0.08), (0.12, 0.13, 0.08), 'M_Shoe', nu=14, nv=8, bone='Leg' + s))
    bones = [('Root', None, (0, 0, 0), (0, 0, 0.1)), ('Hips', 'Root', (0, 0, 0.55), (0, 0, 1.0)), ('Head', 'Hips', (0.1, 0, 1.0), (0.3, 0, 1.4))]
    for sg, s in ((1, '.L'), (-1, '.R')):
        bones += [('Leg' + s, 'Hips', (0.03, sg * 0.18, 0.55), (0.03, sg * 0.18, 0.1)), ('Arm' + s, 'Hips', (0.14, sg * 0.30, 0.90), (0.26, sg * 0.34, 0.74)),
                  ('Wing' + s, 'Hips', (-0.30, sg * 0.30, 0.98), (-0.45, sg * 0.5, 1.4))]
    specs = koopa_specs()

    def wings(arm, obj):
        W = []
        for sg, s in ((1, '.L'), (-1, '.R')):
            for k, (ang, ln, w) in enumerate([(35, 0.50, 0.075), (12, 0.60, 0.085), (-12, 0.56, 0.08), (-34, 0.44, 0.07)]):
                a = math.radians(ang)
                # feather: flat ellipsoid fanning up/back from the wing root
                d = np.array([-0.35 * math.cos(a) * 0.0 - 0.10, sg * math.sin(a) * 0.0 + sg * 0.30 * 0.0, 1.0])
                c = np.array([-0.30, sg * (0.30 + 0.12 * math.sin(a) * 0.0), 0.98]) + np.array([-0.16 * math.cos(a) + 0.0, sg * 0.20 * (1 - math.cos(a)) + sg * 0.1 * math.sin(a) * 0 , 0.0])
                tip = np.array([-0.42 - 0.10 * math.cos(a), sg * (0.42 + 0.30 * math.sin(a)), 0.98 + 0.30 * ln + 0.2 * math.cos(a)])
                mid = (np.array([-0.30, sg * 0.30, 0.98]) + tip) / 2
                zdir = tip - np.array([-0.30, sg * 0.30, 0.98])
                f = ellipsoid('feather' + s, (0, 0, 0), (w * 1.5, 0.025, ln * 0.85), 'M_Wing', nu=14, nv=8, bone='Wing' + s)
                f.xf(frame_from_z(zdir, up=(1, 0, 0)), mid)
                W.append(f)
        sp = [MatSpec('M_Wing', hexlin('#F6F6F2'), rough=0.6, kind='knit', params=dict(pitch=5), bump=1.0, double_sided=True)]
        o, _ = asset.mesh_object('Wings', W, sp, [b[0] for b in bones], 256, 48, 9)
        return [o]

    def clips(arm):
        R = rig.Rig(arm, loc_bones=('Root', 'Hips'))
        def walk(t):
            p = 2 * math.pi * t
            for s, ph, sg in (('L', 0.0, 1), ('R', math.pi, -1)):
                R.R('Leg.' + s, ry=-30 * math.sin(p + ph) + 0, rx=0)
                R.R('Arm.' + s, ry=22 * math.sin(p + ph))
            R.L('Hips', 0, 0, 0.03 * abs(math.sin(p)))
            R.R('Hips', ry=3 + 2 * math.sin(2 * p), rx=3 * math.sin(p))
            R.R('Head', ry=-3 * math.sin(2 * p))
        def idle(t):
            p = 2 * math.pi * t
            R.L('Hips', 0, 0, 0.01 * math.sin(p))
            R.R('Head', ry=3 * math.sin(p + 0.5), rz=4 * math.sin(p))
            for s in 'LR':
                R.R('Arm.' + s, ry=4 * math.sin(p))
        def fly(t):
            p = 2 * math.pi * t
            R.L('Hips', 0, 0, 0.05 * math.sin(p))
            for s, sg in (('L', 1), ('R', -1)):
                R.R('Wing.' + s, rx=sg * (-10 - 38 * math.sin(p)))
            R.R('Leg.L', ry=8); R.R('Leg.R', ry=-8)
        R.clip('walk', 60, walk); R.clip('idle', 90, idle); R.clip('fly', 30, fly)
        return dict(walk=1.0, idle=1.5, fly=0.5)
    return asset.build('koopa', P, specs, bones, 512, clips, extra=wings, seed=7)


def koopa_shell():
    P = []
    P.append(ellipsoid('dome', (0, 0, 0.36), (0.46, 0.46, 0.40), 'M_Shell', nu=32, nv=20, n=2.3, nz=2.0))
    P.append(ellipsoid('rim', (0, 0, 0.17), (0.50, 0.50, 0.075), 'M_Belly', nu=32, nv=8, n=2.5))
    P.append(ellipsoid('plate', (0.0, 0, 0.10), (0.44, 0.44, 0.07), 'M_Belly', nu=28, nv=8, n=2.4))
    for sg in (1, -1):   # retracted limbs / head peeking from the openings
        P.append(ellipsoid('foot', (0.0, sg * 0.40, 0.17), (0.12, 0.10, 0.07), 'M_Skin', nu=12, nv=8))
        P.append(ellipsoid('eye', (0.42, sg * 0.07, 0.19), (0.03, 0.04, 0.05), 'M_Eye', nu=8, nv=6, col=WHITE))
    P.append(ellipsoid('head', (0.43, 0, 0.17), (0.09, 0.14, 0.09), 'M_Skin', nu=14, nv=8))
    P.append(ellipsoid('tail', (-0.43, 0, 0.17), (0.08, 0.10, 0.07), 'M_Skin', nu=12, nv=8))
    specs = koopa_specs()[:3] + [EYE()]
    return asset.build('koopa_shell', P, specs, None, 512, None, seed=11)



# ================================================================== round 2
from lib.asset import eye_pair, cone, clipset
from lib.geo import ellipsoid_point, ellipsoid_normal, rounded_disc, rot_xyz, poly_prism
S = math.sin
TAU = 2 * math.pi


def B(*names_heads):
    """bones helper: (name, parent, head, tail)"""
    return list(names_heads)


ROOT = ('Root', None, (0, 0, 0), (0, 0, 0.1))


def spikes_on(P, C, R, dirs, h, r, mat='M_Spike', ring_mat=None, bone=None, n=2.0):
    for az, el in dirs:
        p = ellipsoid_point(C, R, az, el, n)
        nn = ellipsoid_normal(R, az, el, n)
        P.append(cone('spike', p - nn * 0.02, p + nn * h, r, mat, bone))
        if ring_mat:
            P.append(rounded_disc('spring', r * 1.35, 0.05, 0.02, nu=14, steps=2, mat=ring_mat, bone=bone).aim(p, nn))


# ------------------------------------------------------------------ Piranha plant
def piranha():
    P = []
    P.append(tube('stalk', np.array([[0, 0, 0], [0.02, 0, 0.3], [0, 0, 0.72]]), np.array([0.075, 0.07, 0.07]), nu=12, mat='M_Stem', caps=(1, 2), bone='Stem'))
    for sg in (1, -1):
        lf = ellipsoid('leaf', (0, 0, 0), (0.30, 0.04, 0.11), 'M_Stem', nu=16, nv=8, bone='Stem')
        lf.xf(rot_xyz(0, -sg * 28, 0), (sg * 0.26, 0, 0.16)); P.append(lf)
    C, R = (0, 0, 1.08), (0.34, 0.40, 0.42)
    for side, sg in (('F', 1), ('B', -1)):
        bn = 'Jaw' + side
        jaw = ellipsoid('jaw' + side, C, R, 'M_Head', nu=30, nv=18, bone=bn)
        jaw.V[:, 0] = np.where(sg * jaw.V[:, 0] < 0.03, sg * 0.03, jaw.V[:, 0])      # flat inner face (the mouth)
        P.append(jaw)
        P.append(ellipsoid('mouth' + side, (sg * 0.045, 0, 1.10), (0.02, 0.33, 0.35), 'M_Mouth', nu=20, nv=12, bone=bn))
        a = np.radians(np.linspace(-40, 220, 24))
        rim = np.stack([np.full_like(a, sg * 0.05), 0.385 * np.cos(a), 1.08 + 0.40 * np.sin(a)], 1)
        P.append(tube('lip' + side, rim, np.full(len(rim), 0.035), nu=8, mat='M_Lip', caps=(2, 2), bone=bn))
        for k, ang in enumerate((20, 60, 100, 140)):
            t = math.radians(ang)
            base = np.array([sg * 0.05, 0.34 * math.cos(t), 1.08 + 0.36 * math.sin(t)])
            P.append(cone('tooth', base, base + np.array([-sg * 0.10, -0.03 * math.cos(t), -0.04 * math.sin(t)]), 0.03, 'M_Lip', bn))
        for az, el in ((sg * 60 + (0 if sg > 0 else 180) - (0 if sg > 0 else 120), 20), (90 if sg > 0 else 150, -10), (-90 if sg > 0 else -150, -10), (0 if sg > 0 else 180, 55),
                       (45 * sg, -25), (-45 * sg + (0 if sg > 0 else 180), -25)):
            if sg * math.cos(math.radians(az)) < 0.15:
                continue
            p = ellipsoid_point(C, R, az, el); nn = ellipsoid_normal(R, az, el)
            P.append(rounded_disc('spot', 0.075, 0.03, 0.012, nu=14, steps=2, mat='M_Spot', bone=bn, domed=0.01).aim(p, nn))
    specs = [MatSpec('M_Stem', hexlin('#2E9A33'), rough=0.5, kind='smooth', bump=0.6), MatSpec('M_Head', hexlin('#D9262A'), rough=0.45, kind='skin', bump=0.8),
             MatSpec('M_Mouth', hexlin('#6A0F14'), rough=0.6, kind='skin'), MatSpec('M_Lip', hexlin('#F7F2E6'), rough=0.45, kind='smooth'),
             MatSpec('M_Spot', hexlin('#FAF7EE'), rough=0.5, kind='smooth')]
    bones = [ROOT, ('Stem', 'Root', (0, 0, 0.05), (0, 0, 0.7)), ('JawF', 'Stem', (0, 0, 0.70), (0.2, 0, 1.3)), ('JawB', 'Stem', (0, 0, 0.70), (-0.2, 0, 1.3))]

    def idle(R, t):
        o = 0.5 - 0.5 * math.cos(TAU * t)
        R.R('JawF', ry=4 + 22 * o); R.R('JawB', ry=-4 - 22 * o)
        R.R('Stem', ry=3 * S(TAU * t), rx=2 * S(TAU * t + 1))
    return asset.build('piranha', P, specs, bones, 512, lambda arm: clipset(arm, dict(idle=(0.5, idle))), seed=21)


# ------------------------------------------------------------------ shelled walkers (buzzy beetle, spiny)
def shell_walker(fname, shell_hex, skin_hex, spiky, shell_kind='shell'):
    P = []
    C, Rr = (-0.04, 0, 0.42), (0.47, 0.46, 0.38)
    P.append(ellipsoid('shell', C, Rr, 'M_Shell', nu=32, nv=18, n=2.2, bone='Body'))
    P.append(ellipsoid('rim', (-0.04, 0, 0.17), (0.50, 0.49, 0.07), 'M_Rim', nu=30, nv=8, n=2.4, bone='Body'))
    P.append(ellipsoid('head', (0.40, 0, 0.27), (0.17, 0.20, 0.15), 'M_Skin', nu=18, nv=12, bone='Body'))
    eye_pair(P, (0.52, 0, 0.31), (1, 0, 0.1), 0.085, 0.07, 'Body')
    for sg, s in ((1, '.L'), (-1, '.R')):
        P.append(ellipsoid('foot' + s, (0.12, sg * 0.24, 0.07), (0.17, 0.12, 0.075), 'M_Skin', nu=16, nv=8, bone='Foot' + s))
    if spiky:
        dirs = [(az, el) for el, n in ((70, 1), (38, 6), (12, 8)) for az in np.linspace(0, 360, n, endpoint=False) + (22 if el == 12 else 0)]
        spikes_on(P, C, Rr, dirs, 0.20, 0.07, 'M_Spike', 'M_Spike', 'Body', 2.2)
    else:
        for az in (0, 72, 144, 216, 288):   # buzzy shell ridges
            p = ellipsoid_point(C, Rr, az, 45, 2.2); nn = ellipsoid_normal(Rr, az, 45, 2.2)
            P.append(rounded_disc('ridge', 0.16, 0.03, 0.012, nu=16, steps=2, mat='M_Rim', bone='Body', domed=0.02).aim(p, nn))
    specs = [MatSpec('M_Shell', hexlin(shell_hex), rough=0.22, kind=shell_kind, bump=1.4), MatSpec('M_Rim', hexlin('#F2DDB0' if spiky else '#20232E'), rough=0.4, kind='smooth'),
             MatSpec('M_Skin', hexlin(skin_hex), rough=0.55, kind='skin', bump=0.8), asset_eye()]
    if spiky:
        specs.append(MatSpec('M_Spike', hexlin('#F4ECD8'), rough=0.35, kind='smooth'))
    bones = [ROOT, ('Body', 'Root', (0, 0, 0.15), (0, 0, 0.8)), ('Foot.L', 'Root', (0.12, 0.24, 0.07), (0.25, 0.24, 0.05)),
             ('Foot.R', 'Root', (0.12, -0.24, 0.07), (0.25, -0.24, 0.05))]

    def walk(R, t):
        p = TAU * t
        for s, ph in (('L', 0.0), ('R', math.pi)):
            R.L('Foot.' + s, 0.11 * math.cos(p + ph), 0, 0.06 * max(0.0, -math.sin(p + ph)))
        R.L('Body', 0, 0, 0.015 * abs(math.sin(p)))
        R.R('Body', rx=3 * math.sin(p), ry=2 * math.cos(2 * p))
    clips = lambda arm: clipset(arm, dict(walk=(0.8, walk), idle=(1.5, lambda R, t: R.L('Body', 0, 0, 0.01 * S(TAU * t)))), ('Root', 'Body', 'Foot.L', 'Foot.R'))
    return asset.build(fname, P, specs, bones, 512, clips, seed=23)


def asset_eye():
    return MatSpec('M_Eye', (1, 1, 1), rough=0.12, kind='smooth', vcol=True, bump=0.1, ao_albedo=0.1)


def beetle_shell():
    P = [ellipsoid('dome', (0, 0, 0.36), (0.47, 0.46, 0.36), 'M_Shell', nu=32, nv=18, n=2.2),
         ellipsoid('rim', (0, 0, 0.11), (0.50, 0.49, 0.07), 'M_Rim', nu=30, nv=8, n=2.4)]
    for az in (0, 72, 144, 216, 288):
        p = ellipsoid_point((0, 0, 0.36), (0.47, 0.46, 0.36), az, 45, 2.2); nn = ellipsoid_normal((0.47, 0.46, 0.36), az, 45, 2.2)
        P.append(rounded_disc('ridge', 0.16, 0.03, 0.012, nu=16, steps=2, mat='M_Rim', domed=0.02).aim(p, nn))
    specs = [MatSpec('M_Shell', hexlin('#1C2442'), rough=0.2, kind='shell', bump=1.4), MatSpec('M_Rim', hexlin('#20232E'), rough=0.4, kind='smooth')]
    return asset.build('beetle_shell', P, specs, None, 512, None, seed=24)


# ------------------------------------------------------------------ Blooper
def blooper():
    P = []
    prof = [(0.0, 0.62), (0.26, 0.60), (0.36, 0.72), (0.38, 0.90), (0.33, 1.12), (0.22, 1.33), (0.08, 1.48), (0.0, 1.50)]
    P.append(lathe('mantle', prof, 28, 'M_Body', cap=False, bone='Body'))
    P.append(ellipsoid('skirt', (0, 0, 0.64), (0.34, 0.34, 0.08), 'M_Body', nu=24, nv=8, bone='Body'))
    P.append(ellipsoid('mask', (0, -0.06, 0.82), (0.36, 0.34, 0.11), 'M_Mask', nu=24, nv=10, bone='Body'))
    eye_pair(P, (0, -0.33, 0.83), (0, -1, 0), 0.13, 0.09, 'Body', pupil=0.4, look=0.0)
    for k in range(4):
        a = math.radians(45 + 90 * k)
        top = np.array([0.17 * math.cos(a), 0.17 * math.sin(a), 0.62])
        out = np.array([math.cos(a), math.sin(a), 0]) * 0.06
        path = np.array([top, top + out + [0, 0, -0.2], top + out * 1.5 + [0, 0, -0.42], top + out * 1.2 + [0, 0, -0.58]])
        P.append(tube(f'tent{k}', path, np.array([0.075, 0.07, 0.06, 0.045]), nu=10, mat='M_Body', caps=(1, 3), bone=f'Tent{k}'))
    specs = [MatSpec('M_Body', hexlin('#F4F3EE'), rough=0.35, kind='skin', bump=0.8), MatSpec('M_Mask', hexlin('#15161C'), rough=0.3, kind='smooth'), asset_eye()]
    bones = [ROOT, ('Body', 'Root', (0, 0, 0.6), (0, 0, 1.4))] + [(f'Tent{k}', 'Body', (0.17 * math.cos(math.radians(45 + 90 * k)), 0.17 * math.sin(math.radians(45 + 90 * k)), 0.62),
                                                                   (0.2 * math.cos(math.radians(45 + 90 * k)), 0.2 * math.sin(math.radians(45 + 90 * k)), 0.1)) for k in range(4)]

    def walk(R, t):
        c = 0.5 - 0.5 * math.cos(TAU * t)          # 0 = tentacles closed (thrust), 1 = spread
        R.L('Body', 0, 0, 0.10 * (1 - c) - 0.05)
        for k in range(4):
            a = math.radians(45 + 90 * k)
            ang = 8 + 30 * c                          # tilt outward about the tangent axis
            R.R(f'Tent{k}', rx=ang * math.sin(a), ry=-ang * math.cos(a))
    return asset.build('blooper', P, specs, bones, 512, lambda arm: clipset(arm, dict(walk=(0.8, walk), idle=(0.8, walk)), ('Root', 'Body')), seed=25)


# ------------------------------------------------------------------ Cheep cheep
def cheep():
    P = []
    P.append(ellipsoid('body', (0.02, 0, 0.5), (0.42, 0.25, 0.36), 'M_Body', nu=28, nv=18, bone='Body'))
    P.append(ellipsoid('belly', (0.08, 0, 0.36), (0.32, 0.20, 0.2), 'M_Belly', nu=22, nv=12, bone='Body'))
    P.append(ellipsoid('lips', (0.42, 0, 0.42), (0.06, 0.09, 0.05), 'M_Belly', nu=12, nv=8, bone='Body'))
    eye_pair(P, (0.26, 0, 0.62), (0.45, 0, 0.1), 0.17, 0.11, 'Body', pupil=0.42)
    for k, (ang, ln) in enumerate([(30, 0.34), (0, 0.38), (-30, 0.34)]):
        a = math.radians(ang)
        f = ellipsoid('tail', (0, 0, 0), (0.08, 0.03, ln * 0.5), 'M_Fin', nu=12, nv=8, bone='Tail')
        P.append(f.aim(np.array([-0.40, 0, 0.5]) + np.array([-math.cos(a), 0, math.sin(a)]) * ln * 0.45, (-math.cos(a), 0, math.sin(a)), up=(0, 1, 0)))
    P.append(ellipsoid('dorsal', (-0.05, 0, 0.86), (0.16, 0.03, 0.12), 'M_Fin', nu=14, nv=8, bone='Body', rot=(0, -20, 0)))
    for sg, s in ((1, '.L'), (-1, '.R')):
        f = ellipsoid('fin' + s, (0, 0, 0), (0.17, 0.10, 0.025), 'M_Fin', nu=14, nv=8, bone='Fin' + s)
        P.append(f.xf(rot_xyz(sg * 30, 0, 0), (0.0, sg * 0.31, 0.50)))
    specs = [MatSpec('M_Body', hexlin('#E33A2A'), rough=0.3, kind='shell', bump=0.9), MatSpec('M_Belly', hexlin('#F7EAD6'), rough=0.4, kind='skin'),
             MatSpec('M_Fin', hexlin('#F6F3EC'), rough=0.45, kind='knit', params=dict(pitch=5), bump=0.6, double_sided=True), asset_eye()]
    bones = [ROOT, ('Body', 'Root', (0, 0, 0.5), (0.3, 0, 0.5)), ('Tail', 'Body', (-0.38, 0, 0.5), (-0.7, 0, 0.5)),
             ('Fin.L', 'Body', (0, 0.24, 0.5), (0, 0.45, 0.5)), ('Fin.R', 'Body', (0, -0.24, 0.5), (0, -0.45, 0.5))]

    def walk(R, t):
        p = TAU * t
        R.R('Fin.L', rx=-35 * S(p)); R.R('Fin.R', rx=35 * S(p))
        R.R('Tail', rz=18 * S(p + 1.0))
        R.R('Body', rz=-3 * S(p), ry=3 * S(p + 0.5))
        R.L('Body', 0, 0, 0.02 * S(p))
    return asset.build('cheep', P, specs, bones, 512, lambda arm: clipset(arm, dict(walk=(0.5, walk), idle=(0.5, walk)), ('Root', 'Body')), seed=26)


# ------------------------------------------------------------------ Bullet Bill
def bullet():
    P = []
    prof = [(0.0, -0.44), (0.30, -0.44), (0.40, -0.40), (0.42, -0.2), (0.42, 0.05), (0.38, 0.22), (0.28, 0.36), (0.14, 0.44), (0.0, 0.46)]
    P.append(lathe('body', prof, 30, 'M_Body', cap=False, bone='Body').xf(rot_xyz(0, 90, 0), (0, 0, 0.5)))
    P.append(lathe('base', [(0.0, -0.56), (0.34, -0.56), (0.42, -0.52), (0.44, -0.46), (0.42, -0.40), (0.0, -0.40)], 30, 'M_Base', cap=False, bone='Body')
             .xf(rot_xyz(0, 90, 0), (0, 0, 0.5)))
    P.append(lathe('band', [(0.43, -0.32), (0.45, -0.28), (0.45, -0.22), (0.43, -0.18)], 30, 'M_Base', cap=True, bone='Body').xf(rot_xyz(0, 90, 0), (0, 0, 0.5)))
    for sg in (1, -1):
        p = np.array([0.20, sg * 0.335, 0.70]); nn = np.array([0.45, sg * 0.85, 0.25])
        P.append(ellipsoid('eyew', (0, 0, 0), (0.085, 0.12, 0.05), 'M_Eye', nu=16, nv=10, bone='Body', col=WHITE).aim(p, nn))
        P.append(ellipsoid('pupil', (0, 0, 0), (0.035, 0.06, 0.03), 'M_Eye', nu=10, nv=8, bone='Body', col=BLACK).aim(p + nn / np.linalg.norm(nn) * 0.035 + [0.025, 0, 0], nn))
        P.append(tube('brow', np.array([[0.30, sg * 0.27, 0.84], [0.12, sg * 0.36, 0.84]]), np.array([0.025, 0.025]), nu=8, mat='M_Eye', caps=(2, 2), bone='Body', col=BLACK))
        P.append(ellipsoid('arm' + str(sg), (0, 0, 0), (0.12, 0.05, 0.08), 'M_Arm', nu=14, nv=8, bone='Arm' + ('.L' if sg > 0 else '.R'))
                 .xf(rot_xyz(sg * 20, 20, 0), (-0.05, sg * 0.47, 0.36)))
    specs = [MatSpec('M_Body', hexlin('#1A1B20'), rough=0.25, kind='metal', bump=0.5), MatSpec('M_Base', hexlin('#3A3D46'), rough=0.35, metal=0.6, kind='metal'),
             MatSpec('M_Arm', hexlin('#F4F2EC'), rough=0.6, kind='knit', params=dict(pitch=5)), asset_eye()]
    bones = [ROOT, ('Body', 'Root', (-0.4, 0, 0.5), (0.4, 0, 0.5)), ('Arm.L', 'Body', (0.0, 0.42, 0.4), (-0.1, 0.5, 0.3)), ('Arm.R', 'Body', (0.0, -0.42, 0.4), (-0.1, -0.5, 0.3))]

    def idle(R, t):
        p = TAU * t
        R.R('Arm.L', ry=25 * S(p)); R.R('Arm.R', ry=-25 * S(p))
        R.L('Body', 0, 0, 0.015 * S(2 * p)); R.R('Body', rx=2 * S(p))
    return asset.build('bullet', P, specs, bones, 512, lambda arm: clipset(arm, dict(idle=(0.5, idle), walk=(0.5, idle)), ('Root', 'Body')), seed=27)


# ------------------------------------------------------------------ Lakitu
def lakitu():
    P = []
    for c, r in [((0, 0, 0.30), (0.42, 0.40, 0.26)), ((0.22, 0.18, 0.36), 0.20), ((-0.24, 0.16, 0.34), 0.21), ((0.18, -0.22, 0.30), 0.21),
                 ((-0.20, -0.22, 0.32), 0.21), ((0.0, 0.0, 0.10), (0.30, 0.30, 0.12)), ((0.36, 0.0, 0.28), 0.17)]:
        P.append(ellipsoid('cloud', c, r if isinstance(r, tuple) else (r, r, r), 'M_Cloud', nu=18, nv=12, bone='Cloud'))
    eye_pair(P, (0.16, -0.34, 0.33), (0.35, -1, 0.05), 0.09, 0.055, 'Cloud', pupil=0.45, look=0.0)
    a = np.radians(np.linspace(200, 340, 9))
    P.append(tube('smile', np.stack([0.15 + 0.10 * np.cos(a) * 0.4, -0.40 + 0.0 * a, 0.27 + 0.07 * np.sin(a)], 1) + np.array([0, 0.02, 0]),
                  np.full(9, 0.012), nu=6, mat='M_Eye', caps=(2, 2), bone='Cloud', col=BLACK))
    P.append(ellipsoid('shell', (-0.10, 0, 0.72), (0.26, 0.28, 0.28), 'M_Shell', nu=22, nv=14, bone='Body'))
    P.append(ellipsoid('belly', (0.06, 0, 0.70), (0.18, 0.22, 0.24), 'M_Belly', nu=18, nv=12, bone='Body'))
    P.append(ellipsoid('head', (0.10, 0, 1.12), (0.21, 0.19, 0.20), 'M_Skin', nu=20, nv=14, bone='Body'))
    P.append(ellipsoid('snout', (0.28, 0, 1.08), (0.12, 0.11, 0.08), 'M_Skin', nu=14, nv=8, bone='Body'))
    eye_pair(P, (0.24, 0, 1.20), (1, 0, 0.1), 0.085, 0.07, 'Body')
    for sg in (1, -1):   # goggles
        P.append(lathe('goggle', [(0.06, -0.02), (0.085, -0.01), (0.085, 0.02), (0.06, 0.03)], 14, 'M_Goggle', cap=False, bone='Body').aim((0.28, sg * 0.085, 1.20), (1, 0, 0.1)))
    P.append(tube('strap', np.array([[0.24, 0.14, 1.22], [0.05, 0.2, 1.26], [-0.12, 0.0, 1.24], [0.05, -0.2, 1.26], [0.24, -0.14, 1.22]]), np.full(5, 0.022),
                  nu=6, mat='M_Goggle', caps=(1, 1), bone='Body'))
    for sg, s in ((1, '.L'), (-1, '.R')):
        P.append(tube('arm' + s, np.array([[0.05, sg * 0.20, 0.82], [0.20, sg * 0.28, 0.70]]), np.array([0.05, 0.05]), nu=8, mat='M_Skin', caps=(2, 3), bone='Arm' + s))
    specs = [MatSpec('M_Cloud', hexlin('#F7F8FA'), rough=0.85, kind='fur', bump=0.7), MatSpec('M_Shell', hexlin('#2FA52F'), rough=0.35, kind='shell'),
             MatSpec('M_Belly', hexlin('#F4E3A8'), rough=0.5, kind='skin'), MatSpec('M_Skin', hexlin(KSKIN), rough=0.55, kind='skin'),
             MatSpec('M_Goggle', hexlin('#3A3D46'), rough=0.3, metal=0.5, kind='metal'), asset_eye()]
    bones = [ROOT, ('Cloud', 'Root', (0, 0, 0.2), (0, 0, 0.5)), ('Body', 'Cloud', (0, 0, 0.55), (0, 0, 1.3)),
             ('Arm.L', 'Body', (0.05, 0.2, 0.82), (0.2, 0.28, 0.7)), ('Arm.R', 'Body', (0.05, -0.2, 0.82), (0.2, -0.28, 0.7))]

    def walk(R, t):
        p = TAU * t
        R.L('Cloud', 0, 0, 0.06 * S(p))
        R.R('Cloud', rx=3 * S(p + 0.6), ry=2 * S(p))
        R.R('Body', ry=4 * S(p - 0.8), rz=4 * S(p))
        R.R('Arm.L', ry=-20 * S(p)); R.R('Arm.R', ry=20 * S(p))
    return asset.build('lakitu', P, specs, bones, 512, lambda arm: clipset(arm, dict(walk=(1.0, walk), idle=(1.0, walk)), ('Root', 'Cloud')), seed=28)


# ------------------------------------------------------------------ Hammer + Hammer Bro
def hammer_parts(bone, scale=1.0, c=(0, 0, 0)):
    P = [tube('handle', np.array([[0, 0, -0.30], [0, 0, 0.18]]), np.array([0.035, 0.035]), nu=10, mat='M_Handle', caps=(2, 1), bone=bone),
         geo.rounded_box('hhead', (0.30, 0.15, 0.15), 0.03, (0, 0, 0.24), mat='M_Metal', segs=2, bone=bone)]
    for p in P:
        p.xf(None, c, scale)
    return P


HAMMER_SPECS = lambda: [MatSpec('M_Handle', hexlin('#9A6A3A'), rough=0.6, kind='grain', params=dict(scale=20)), MatSpec('M_Metal', hexlin('#8E949E'), rough=0.3, metal=0.9, kind='metal')]


def hammer():
    P = hammer_parts('Spin', 1.0, (0, 0, 0))
    bones = [('Root', None, (0, 0, -0.4), (0, 0, -0.3)), ('Spin', 'Root', (0, 0, 0), (0, 0, 0.3))]
    return asset.build('hammer', P, HAMMER_SPECS(), bones, 256, lambda arm: clipset(arm, dict(spin=(0.4, lambda R, t: R.R('Spin', ry=-360 * t)))), seed=29)


def hammer_bro():
    P = []
    P.append(ellipsoid('shell', (-0.16, 0, 0.82), (0.36, 0.40, 0.42), 'M_Shell', nu=26, nv=16, n=2.3, bone='Hips', rot=(0, -8, 0)))
    P.append(ellipsoid('belly', (0.06, 0, 0.78), (0.27, 0.32, 0.36), 'M_Belly', nu=22, nv=14, bone='Hips'))
    P.append(ellipsoid('rim', (-0.14, 0, 0.50), (0.40, 0.42, 0.06), 'M_Belly', nu=24, nv=8, n=2.4, bone='Hips'))
    P.append(tube('neck', np.array([[0.08, 0, 1.0], [0.14, 0, 1.12]]), np.array([0.11, 0.11]), nu=12, mat='M_Skin', caps=(2, 2), bone='Head'))
    P.append(ellipsoid('head', (0.20, 0, 1.22), (0.22, 0.19, 0.19), 'M_Skin', nu=20, nv=14, bone='Head'))
    P.append(ellipsoid('snout', (0.38, 0, 1.16), (0.13, 0.11, 0.08), 'M_Skin', nu=14, nv=8, bone='Head'))
    P.append(ellipsoid('helmet', (0.16, 0, 1.30), (0.25, 0.23, 0.20), 'M_Helmet', nu=22, nv=14, bone='Head'))
    P.append(ellipsoid('visor', (0.34, 0, 1.30), (0.10, 0.20, 0.035), 'M_Helmet', nu=16, nv=8, bone='Head', rot=(0, -10, 0)))
    eye_pair(P, (0.36, 0, 1.22), (1, 0, 0.05), 0.08, 0.075, 'Head')
    for sg, s in ((1, '.L'), (-1, '.R')):
        P.append(tube('arm' + s, np.array([[0.10, sg * 0.30, 0.95], [0.24, sg * 0.36, 0.80]]), np.array([0.07, 0.065]), nu=10, mat='M_Skin', caps=(3, 3), bone='Arm' + s))
        P.append(tube('leg' + s, np.array([[0.02, sg * 0.17, 0.55], [0.04, sg * 0.17, 0.2]]), np.array([0.10, 0.095]), nu=10, mat='M_Skin', caps=(3, 2), bone='Leg' + s))
        P.append(ellipsoid('shoe' + s, (0.12, sg * 0.17, 0.09), (0.23, 0.14, 0.10), 'M_Shoe', nu=18, nv=10, n=2.4, bone='Leg' + s))
    P += hammer_parts('Arm.R', 0.9, (0.30, -0.38, 0.98))
    specs = [MatSpec('M_Shell', hexlin('#2FA52F'), rough=0.38, kind='shell', bump=1.6), MatSpec('M_Belly', hexlin('#F4E3A8'), rough=0.55, kind='shell'),
             MatSpec('M_Skin', hexlin(KSKIN), rough=0.55, kind='skin'), MatSpec('M_Shoe', hexlin('#E86A1C'), rough=0.5, kind='grain'),
             MatSpec('M_Helmet', hexlin('#2F8A3A'), rough=0.3, metal=0.2, kind='metal'), asset_eye()] + HAMMER_SPECS()
    bones = [ROOT, ('Hips', 'Root', (0, 0, 0.55), (0, 0, 1.0)), ('Head', 'Hips', (0.08, 0, 0.98), (0.2, 0, 1.4))]
    for sg, s in ((1, '.L'), (-1, '.R')):
        bones += [('Leg' + s, 'Hips', (0.03, sg * 0.17, 0.55), (0.03, sg * 0.17, 0.1)), ('Arm' + s, 'Hips', (0.10, sg * 0.30, 0.95), (0.24, sg * 0.36, 0.80))]

    def walk(R, t):
        p = TAU * t
        for s, ph in (('L', 0.0), ('R', math.pi)):
            R.R('Leg.' + s, ry=-26 * S(p + ph))
        R.R('Arm.L', ry=20 * S(p)); R.R('Arm.R', ry=-110 - 20 * S(2 * p))      # hammer held up
        R.L('Hips', 0, 0, 0.03 * abs(S(p))); R.R('Head', ry=-3 * S(2 * p))

    def idle(R, t):
        p = TAU * t
        R.R('Arm.R', ry=-90 - 50 * (0.5 + 0.5 * S(p))); R.R('Arm.L', ry=6 * S(p))
        R.L('Hips', 0, 0, 0.02 * S(2 * p)); R.R('Head', rz=4 * S(p))
    return asset.build('hammer_bro', P, specs, bones, 512, lambda arm: clipset(arm, dict(walk=(1.0, walk), idle=(1.0, idle)), ('Root', 'Hips')), seed=30)


# ------------------------------------------------------------------ Podoboo
def podoboo():
    P = [sphere('core', (0, 0, 0.0), 0.40, 'M_Lava', nu=24, nv=16, bone='Core')]
    P.append(ellipsoid('hot', (0, -0.18, 0.05), (0.26, 0.26, 0.28), 'M_Hot', nu=18, nv=12, bone='Core'))
    for k in range(6):
        a = TAU * k / 6
        d = np.array([math.cos(a) * 0.6, math.sin(a) * 0.6, -0.8]); d /= np.linalg.norm(d)
        f = ellipsoid('lick', (0, 0, 0), (0.10, 0.08, 0.22), 'M_Lava', nu=10, nv=8, bone=f'Lick{k}')
        P.append(f.aim(d * 0.42, d))
    for sg in (1, -1):
        P.append(ellipsoid('eye', (0, 0, 0), (0.06, 0.11, 0.03), 'M_Eye', nu=12, nv=8, bone='Core', col=(0.02, 0.0, 0.0)).aim((sg * 0.12, -0.38, 0.1), (sg * 0.15, -1, 0.1)))
    specs = [MatSpec('M_Lava', hexlin('#E8360C'), rough=0.6, kind='fur', bump=0.8, emissive=hexlin('#FF2A00'), emissive_strength=0.7, ao_albedo=0, ao_strength=0.3),
             MatSpec('M_Hot', hexlin('#FFD25A'), rough=0.6, kind='smooth', emissive=hexlin('#FFC040'), emissive_strength=1.6, ao_albedo=0, ao_strength=0),
             MatSpec('M_Eye', (1, 1, 1), rough=0.5, kind='smooth', vcol=True, ao_albedo=0)]
    bones = [('Root', None, (0, 0, -0.5), (0, 0, -0.4)), ('Core', 'Root', (0, 0, 0), (0, 0, 0.4))] + \
            [(f'Lick{k}', 'Core', (math.cos(TAU * k / 6) * 0.2, math.sin(TAU * k / 6) * 0.2, -0.2), (math.cos(TAU * k / 6) * 0.4, math.sin(TAU * k / 6) * 0.4, -0.5)) for k in range(6)]

    def idle(R, t):
        p = TAU * t
        R.R('Core', rz=8 * S(p), rx=4 * S(2 * p))
        R.L('Core', 0, 0, 0.02 * S(3 * p))
        for k in range(6):
            R.R(f'Lick{k}', rx=14 * S(2 * p + k * 1.7), ry=14 * S(3 * p + k))
    return asset.build('podoboo', P, specs, bones, 256, lambda arm: clipset(arm, dict(idle=(0.5, idle)), ('Root', 'Core')), seed=31)


# ------------------------------------------------------------------ Bowser + flame
def bowser():
    P = []
    P.append(ellipsoid('body', (0.0, 0, 1.0), (0.58, 0.66, 0.62), 'M_Skin', nu=22, nv=14, bone='Hips'))
    P.append(ellipsoid('belly', (0.26, 0, 0.98), (0.40, 0.52, 0.56), 'M_Belly', nu=22, nv=14, bone='Hips'))
    SC, SR = (-0.32, 0, 1.12), (0.55, 0.72, 0.70)
    P.append(ellipsoid('shell', SC, SR, 'M_Shell', nu=26, nv=16, n=2.2, bone='Hips', rot=(0, -12, 0)))
    P.append(ellipsoid('shellrim', (-0.14, 0, 1.05), (0.50, 0.76, 0.72), 'M_Spike', nu=24, nv=12, bone='Hips', rot=(0, -12, 0)).deform(lambda V: V * [0.98, 1, 1]))
    P[-1].V[:, 0] = np.minimum(P[-1].V[:, 0], P[-1].V[:, 0])
    dirs = [(az, el) for el, n in ((10, 5), (40, 4), (70, 2)) for az in np.linspace(110, 250, n)]
    spikes_on(P, SC, SR, dirs, 0.26, 0.09, 'M_Spike', 'M_Spike', 'Hips', 2.2)
    P.append(tube('tail', np.array([[-0.6, 0, 0.6], [-0.85, 0, 0.45], [-1.0, 0, 0.42]]), np.array([0.16, 0.10, 0.05]), nu=12, mat='M_Skin', caps=(1, 3), bone='Hips'))
    for sg, s in ((1, '.L'), (-1, '.R')):
        P.append(tube('leg' + s, np.array([[0.0, sg * 0.42, 0.7], [0.04, sg * 0.45, 0.25]]), np.array([0.22, 0.19]), nu=14, mat='M_Skin', caps=(2, 2), bone='Leg' + s))
        P.append(ellipsoid('foot' + s, (0.16, sg * 0.45, 0.12), (0.34, 0.21, 0.13), 'M_Skin', nu=18, nv=10, n=2.3, bone='Leg' + s))
        for k in (-1, 0, 1):
            P.append(cone('claw', (0.42, sg * 0.45 + k * 0.11, 0.08), (0.56, sg * 0.45 + k * 0.13, 0.05), 0.045, 'M_Horn', 'Leg' + s, nu=8))
        P.append(tube('arm' + s, np.array([[0.20, sg * 0.58, 1.35], [0.42, sg * 0.70, 1.08]]), np.array([0.14, 0.12]), nu=12, mat='M_Skin', caps=(3, 2), bone='Arm' + s))
        P.append(ellipsoid('hand' + s, (0.50, sg * 0.72, 1.00), (0.12, 0.11, 0.12), 'M_Skin', nu=14, nv=8, bone='Arm' + s))
        P.append(lathe('cuff' + s, [(0.12, -0.04), (0.17, -0.02), (0.17, 0.03), (0.12, 0.05)], 14, 'M_Spike', cap=False, bone='Arm' + s).aim((0.38, sg * 0.68, 1.13), (0.6, sg * 0.3, -0.8)))
        for d in ((0.06, 0.0, -0.10), (0.10, 0.04, -0.06), (0.10, -0.04, -0.06)):
            b = np.array([0.56, sg * 0.72, 1.0]) + [d[0] * 0.5, sg * d[1], d[2] * 0.5]
            P.append(cone('fclaw', b, b + np.array(d), 0.03, 'M_Horn', 'Arm' + s, nu=8))
    # head
    P.append(ellipsoid('head', (0.42, 0, 1.70), (0.36, 0.38, 0.30), 'M_Skin', nu=26, nv=16, bone='Head'))
    P.append(ellipsoid('muzzle', (0.72, 0, 1.64), (0.24, 0.30, 0.16), 'M_Belly', nu=20, nv=12, bone='Head'))
    P.append(ellipsoid('jaw', (0.66, 0, 1.46), (0.26, 0.28, 0.09), 'M_Belly', nu=20, nv=10, bone='Jaw'))
    P.append(ellipsoid('mouth', (0.66, 0, 1.53), (0.24, 0.26, 0.04), 'M_Mouth', nu=18, nv=8, bone='Jaw'))
    for k in (-1, 1):
        P.append(cone('fang', (0.84, k * 0.13, 1.57), (0.86, k * 0.13, 1.47), 0.035, 'M_Horn', 'Head', nu=8))
    for sg in (1, -1):
        P.append(ellipsoid('nostril', (0.95, sg * 0.08, 1.70), (0.02, 0.03, 0.02), 'M_Mouth', nu=8, nv=6, bone='Head'))
        P.append(cone('horn', (0.30, sg * 0.24, 1.92), (0.24, sg * 0.40, 2.12), 0.08, 'M_Horn', 'Head'))
        P.append(tube('brow', np.array([[0.70, sg * 0.05, 1.86], [0.62, sg * 0.20, 1.92]]), np.array([0.035, 0.03]), nu=8, mat='M_Hair', caps=(2, 2), bone='Head'))
    eye_pair(P, (0.66, 0, 1.80), (1, 0, 0.1), 0.13, 0.085, 'Head')
    for k, (dx, dz, ang) in enumerate([(0.18, 1.98, 30), (0.06, 1.98, 60), (-0.04, 1.90, 100), (-0.08, 1.78, 130)]):
        a = math.radians(ang)
        P.append(cone('hair', (dx, 0, dz - 0.08), (dx - 0.24 * math.cos(math.radians(ang - 90)) * 0 - 0.2 * math.sin(a) * 0.0 - 0.18, 0, dz + 0.14 * math.cos(a) + 0.04), 0.12, 'M_Hair', 'Head'))
        for sg in (1, -1):
            P.append(cone('hairs', (dx, sg * 0.14, dz - 0.1), (dx - 0.16, sg * 0.24, dz + 0.10 * math.cos(a)), 0.09, 'M_Hair', 'Head'))
    specs = [MatSpec('M_Skin', hexlin('#5FA83A'), rough=0.5, kind='grain', params=dict(scale=40), bump=1.6), MatSpec('M_Belly', hexlin('#F2D57A'), rough=0.5, kind='shell', bump=1.2),
             MatSpec('M_Shell', hexlin('#2E7D32'), rough=0.3, kind='shell', bump=1.6), MatSpec('M_Spike', hexlin('#F4EEDC'), rough=0.35, kind='smooth'),
             MatSpec('M_Horn', hexlin('#F0E6C8'), rough=0.4, kind='smooth'), MatSpec('M_Hair', hexlin('#E2502A'), rough=0.55, kind='hair', bump=2.4),
             MatSpec('M_Mouth', hexlin('#5A1010'), rough=0.6, kind='skin'), asset_eye()]
    bones = [ROOT, ('Hips', 'Root', (0, 0, 0.7), (0, 0, 1.4)), ('Head', 'Hips', (0.30, 0, 1.45), (0.6, 0, 2.0)), ('Jaw', 'Head', (0.48, 0, 1.55), (0.85, 0, 1.45))]
    for sg, s in ((1, '.L'), (-1, '.R')):
        bones += [('Leg' + s, 'Hips', (0.0, sg * 0.42, 0.72), (0.0, sg * 0.45, 0.2)), ('Arm' + s, 'Hips', (0.20, sg * 0.58, 1.35), (0.42, sg * 0.70, 1.08))]

    def walk(R, t):
        p = TAU * t
        for s, ph in (('L', 0.0), ('R', math.pi)):
            R.R('Leg.' + s, ry=-20 * S(p + ph))
            R.R('Arm.' + s, ry=14 * S(p + ph))
        R.L('Hips', 0, 0, 0.04 * abs(S(p))); R.R('Hips', rx=3 * S(p)); R.R('Head', ry=-3 * S(2 * p))
        R.R('Jaw', ry=-6 - 4 * S(2 * p))

    def idle(R, t):
        p = TAU * t
        R.L('Hips', 0, 0, 0.015 * S(p)); R.R('Head', ry=-2 * S(p), rz=4 * S(p))
        R.R('Jaw', ry=-4 - 14 * max(0.0, S(p)))
        R.R('Arm.L', ry=5 * S(p)); R.R('Arm.R', ry=-5 * S(p))
    return asset.build('bowser', P, specs, bones, 1024, lambda arm: clipset(arm, dict(walk=(1.2, walk), idle=(2.0, idle)), ('Root', 'Hips')), seed=32)


def bowser_flame():
    P = []
    n = 4
    for k in range(n):         # tail end at +X (thick), tip at -X
        x = 0.55 - k * 0.38
        r = 0.24 * (1 - k / (n + 0.6))
        P.append(ellipsoid(f'outer{k}', (x, 0, 0), (0.28, r * 1.0, r), 'M_Flame', nu=18, nv=10, bone=f'F{k}'))
        P.append(ellipsoid(f'inner{k}', (x + 0.03, -0.04, 0), (0.22, r * 0.7, r * 0.6), 'M_Core', nu=14, nv=8, bone=f'F{k}'))
        for sg in (1, -1):
            P.append(cone('lick', (x + 0.05, 0, sg * r * 0.7), (x + 0.22, 0, sg * (r + 0.12)), r * 0.45, 'M_Flame', f'F{k}', nu=8))
    P.append(cone('tip', (-0.55, 0, 0), (-0.78, 0, 0), 0.10, 'M_Flame', 'F3', nu=10))
    for p in P:
        p.V[:, 2] += 0.0
    specs = [MatSpec('M_Flame', hexlin('#FF5A12'), rough=0.6, kind='fur', bump=0.6, emissive=hexlin('#FF3A00'), emissive_strength=0.8, ao_albedo=0, ao_strength=0),
             MatSpec('M_Core', hexlin('#FFE070'), rough=0.6, kind='smooth', emissive=hexlin('#FFD040'), emissive_strength=2.0, ao_albedo=0, ao_strength=0)]
    bones = [('Root', None, (0.8, 0, 0), (0.9, 0, 0))]
    for k in range(4):
        bones.append((f'F{k}', 'Root' if k == 0 else f'F{k-1}', (0.75 - k * 0.38, 0, 0), (0.37 - k * 0.38, 0, 0)))

    def idle(R, t):
        p = TAU * t
        for k in range(4):
            R.R(f'F{k}', ry=5 * S(2 * p + k * 1.3), rz=4 * S(p + k))
    return asset.build('bowser_flame', P, specs, bones, 256, lambda arm: clipset(arm, dict(idle=(0.5, idle))), seed=33)


BUILDERS = dict(goomba=goomba, koopa=koopa, koopa_shell=koopa_shell, piranha=piranha,
                beetle=lambda: shell_walker('beetle', '#1C2442', '#F2B98A', False), beetle_shell=beetle_shell,
                spiny=lambda: shell_walker('spiny', '#D8302A', '#F2A65A', True), blooper=blooper, cheep=cheep, bullet=bullet, lakitu=lakitu,
                hammer_bro=hammer_bro, hammer=hammer, podoboo=podoboo, bowser=bowser, bowser_flame=bowser_flame)

if __name__ == '__main__':
    sel = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(BUILDERS)
    for n in sel:
        BUILDERS[n]()

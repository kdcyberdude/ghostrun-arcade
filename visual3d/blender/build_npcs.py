"""Build out/toad.glb and out/princess.glb (1.5 tall, origin at the feet centre, facing +X).
Run: visual3d/blender/run.sh visual3d/blender/build_npcs.py [-- toad princess]"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
from lib import asset
from lib.asset import eye_pair, cone, clipset
from lib.geo import ellipsoid, sphere, tube, lathe, rounded_disc, ellipsoid_point, ellipsoid_normal, rot_xyz
from lib.bake import MatSpec, hexlin

TAU = 2 * math.pi
S = math.sin
EYE = lambda: MatSpec('M_Eye', (1, 1, 1), rough=0.12, kind='smooth', vcol=True, bump=0.1, ao_albedo=0.1)
ROOT = ('Root', None, (0, 0, 0), (0, 0, 0.1))


def humanoid_bones(hip, neck, sh):
    b = [ROOT, ('Hips', 'Root', (0, 0, hip), (0, 0, hip + 0.15)), ('Spine', 'Hips', (0, 0, hip + 0.15), (0, 0, neck)), ('Head', 'Spine', (0, 0, neck), (0, 0, neck + 0.4))]
    for sg, s in ((1, '.L'), (-1, '.R')):
        b.append(('Arm' + s, 'Spine', (0, sg * sh[0], sh[1]), (0.05, sg * (sh[0] + 0.06), sh[1] - 0.3)))
    return b


def idle_fn(R, t):
    p = TAU * t
    R.L('Hips', 0, 0, 0.008 * S(2 * p))
    R.R('Spine', ry=1.5 * S(2 * p), rz=3 * S(p))
    R.R('Head', ry=2 * S(2 * p - 0.5), rz=-5 * S(p), rx=3 * S(p + 1))
    R.R('Arm.L', ry=-4 * S(p), rx=4 + 2 * S(2 * p)); R.R('Arm.R', ry=4 * S(p), rx=-4 - 2 * S(2 * p))


def toad():
    P = []
    C, Rr = (0, 0, 1.10), (0.50, 0.50, 0.38)
    P.append(ellipsoid('cap', C, Rr, 'M_Cap', nu=34, nv=20, n=2.2, bone='Head'))
    P.append(ellipsoid('capunder', (0, 0, 0.86), (0.40, 0.40, 0.06), 'M_Skin', nu=24, nv=8, bone='Head'))
    for az, el, r in [(0, 30, 0.15), (-90, 25, 0.16), (90, 25, 0.16), (180, 30, 0.15), (-45, 70, 0.12), (135, 70, 0.12)]:
        p = ellipsoid_point(C, Rr, az, el, 2.2); nn = ellipsoid_normal(Rr, az, el, 2.2)
        P.append(rounded_disc('spot', r, 0.04, 0.015, nu=18, steps=2, mat='M_Spot', domed=0.02, bone='Head').aim(p, nn))
    P.append(ellipsoid('face', (0.06, 0, 0.82), (0.22, 0.24, 0.19), 'M_Skin', nu=22, nv=14, bone='Head'))
    eye_pair(P, (0.25, 0, 0.84), (1, 0, 0), 0.08, 0.075, 'Head', pupil=0.45, look=0.0)
    a = np.radians(np.linspace(200, 340, 7))
    P.append(tube('smile', np.stack([np.full(7, 0.265), 0.06 * np.cos(a), 0.74 + 0.03 * np.sin(a)], 1), np.full(7, 0.012), nu=6, mat='M_Eye', caps=(2, 2), bone='Head',
                  col=(0.3, 0.05, 0.05)))
    P.append(ellipsoid('vest', (0, 0, 0.55), (0.25, 0.27, 0.22), 'M_Vest', nu=22, nv=14, bone='Spine'))
    P.append(ellipsoid('shirt', (0.10, 0, 0.56), (0.17, 0.17, 0.19), 'M_Pants', nu=16, nv=10, bone='Spine'))
    P.append(ellipsoid('pants', (0, 0, 0.30), (0.25, 0.27, 0.17), 'M_Pants', nu=22, nv=12, bone='Hips'))
    for sg, s in ((1, '.L'), (-1, '.R')):
        P.append(ellipsoid('shoe' + s, (0.06, sg * 0.12, 0.07), (0.16, 0.10, 0.07), 'M_Shoe', nu=14, nv=8, bone='Hips'))
        P.append(tube('arm' + s, np.array([[0, sg * 0.26, 0.66], [0.04, sg * 0.31, 0.48]]), np.array([0.06, 0.055]), nu=10, mat='M_Vest', caps=(2, 1), bone='Arm' + s))
        P.append(sphere('hand' + s, (0.05, sg * 0.32, 0.43), 0.06, 'M_Skin', nu=12, nv=8, bone='Arm' + s))
    specs = [MatSpec('M_Cap', hexlin('#F7F5EE'), rough=0.45, kind='skin', bump=0.6), MatSpec('M_Spot', hexlin('#E0282C'), rough=0.45, kind='smooth'),
             MatSpec('M_Skin', hexlin('#F4C79C'), rough=0.55, kind='skin', bump=0.8), MatSpec('M_Vest', hexlin('#2050C8'), rough=0.7, kind='weave', params=dict(pitch=4), bump=1.2),
             MatSpec('M_Pants', hexlin('#F4F1E8'), rough=0.7, kind='weave', params=dict(pitch=4), bump=1.0), MatSpec('M_Shoe', hexlin('#7A4422'), rough=0.5, kind='grain'), EYE()]
    bones = humanoid_bones(0.18, 0.72, (0.26, 0.66))
    return asset.build('toad', P, specs, bones, 512, lambda arm: clipset(arm, dict(idle=(2.0, idle_fn)), ('Root', 'Hips')), seed=41)


def princess():
    P = []
    P.append(lathe('dress', [(0.0, 0.02), (0.40, 0.02), (0.42, 0.06), (0.36, 0.25), (0.26, 0.50), (0.17, 0.72), (0.15, 0.80), (0.0, 0.82)], 28, 'M_Dress', cap=False, bone='Hips'))
    P.append(lathe('hem', [(0.38, 0.0), (0.44, 0.02), (0.44, 0.08), (0.40, 0.10), (0.36, 0.06)], 28, 'M_Trim', cap=False, bone='Hips'))
    P.append(ellipsoid('sash', (0, 0, 0.78), (0.19, 0.20, 0.05), 'M_Trim', nu=20, nv=8, bone='Hips'))
    P.append(ellipsoid('bodice', (0.01, 0, 0.92), (0.16, 0.19, 0.16), 'M_Dress', nu=20, nv=12, bone='Spine'))
    P.append(ellipsoid('brooch', (0.16, 0, 0.98), (0.03, 0.05, 0.05), 'M_Crown', nu=10, nv=8, bone='Spine'))
    P.append(ellipsoid('neck', (0, 0, 1.06), (0.06, 0.06, 0.07), 'M_Skin', nu=12, nv=8, bone='Head'))
    P.append(ellipsoid('head', (0.02, 0, 1.22), (0.17, 0.165, 0.18), 'M_Skin', nu=24, nv=16, bone='Head'))
    eye_pair(P, (0.17, 0, 1.24), (1, 0, 0), 0.065, 0.055, 'Head', pupil=0.5, look=0.0)
    P.append(ellipsoid('lips', (0.185, 0, 1.135), (0.02, 0.035, 0.012), 'M_Eye', nu=10, nv=6, bone='Head', col=(0.75, 0.12, 0.15)))
    P.append(ellipsoid('hair', (-0.05, 0, 1.25), (0.19, 0.20, 0.20), 'M_Hair', nu=24, nv=16, bone='Head'))
    P.append(ellipsoid('fringe', (0.10, 0, 1.36), (0.11, 0.17, 0.06), 'M_Hair', nu=16, nv=10, bone='Head', rot=(0, -20, 0)))
    P.append(tube('mane', np.array([[-0.12, 0, 1.22], [-0.20, 0, 1.0], [-0.20, 0, 0.78]]), np.array([[0.16, 0.12], [0.18, 0.11], [0.12, 0.07]]), nu=12, mat='M_Hair',
                  caps=(2, 3), up=(1, 0, 0), bone='Head'))
    for sg in (1, -1):
        P.append(ellipsoid('lock', (0.02, sg * 0.17, 1.08), (0.06, 0.05, 0.14), 'M_Hair', nu=12, nv=8, bone='Head'))
    P.append(lathe('crown', [(0.08, 0.0), (0.09, 0.0), (0.09, 0.05), (0.08, 0.05)], 18, 'M_Crown', cap=True, bone='Head').xf(None, (0.0, 0, 1.40)))
    for k in range(5):
        a = TAU * k / 5
        P.append(cone('pt', (0.085 * math.cos(a), 0.085 * math.sin(a), 1.44), (0.09 * math.cos(a), 0.09 * math.sin(a), 1.51), 0.022, 'M_Crown', 'Head', nu=8))
    P.append(sphere('jewel', (0.09, 0, 1.425), 0.018, 'M_Trim', nu=10, nv=6, bone='Head'))
    for sg, s in ((1, '.L'), (-1, '.R')):
        P.append(ellipsoid('puff' + s, (0, sg * 0.19, 0.98), (0.08, 0.08, 0.07), 'M_Dress', nu=14, nv=8, bone='Arm' + s))
        P.append(tube('arm' + s, np.array([[0, sg * 0.20, 0.96], [0.05, sg * 0.24, 0.80], [0.10, sg * 0.22, 0.70]]), np.array([0.035, 0.032, 0.03]), nu=8, mat='M_Skin',
                      caps=(1, 2), bone='Arm' + s))
        P.append(tube('glove' + s, np.array([[0.06, sg * 0.235, 0.78], [0.11, sg * 0.22, 0.67]]), np.array([0.04, 0.04]), nu=8, mat='M_Dress', caps=(1, 3), bone='Arm' + s))
    specs = [MatSpec('M_Dress', hexlin('#F6F1E6'), rough=0.6, kind='weave', params=dict(pitch=3), bump=0.8), MatSpec('M_Trim', hexlin('#D8303A'), rough=0.5, kind='weave', params=dict(pitch=3)),
             MatSpec('M_Skin', hexlin('#F6C8A4'), rough=0.55, kind='skin', bump=0.6), MatSpec('M_Hair', hexlin('#E2702A'), rough=0.5, kind='hair', bump=2.4),
             MatSpec('M_Crown', hexlin('#F4C430'), rough=0.25, metal=0.9, kind='metal'), EYE()]
    bones = humanoid_bones(0.70, 1.05, (0.19, 0.98))
    return asset.build('princess', P, specs, bones, 512, lambda arm: clipset(arm, dict(idle=(2.0, idle_fn)), ('Root', 'Hips')), seed=42)


if __name__ == '__main__':
    sel = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['toad', 'princess']
    for n in sel:
        dict(toad=toad, princess=princess)[n]()

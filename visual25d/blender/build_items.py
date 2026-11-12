"""Build out/mushroom.glb, one_up.glb, fire_flower.glb, star.glb, coin.glb, fireball.glb.
Run: visual25d/blender/run.sh visual25d/blender/build_items.py
Faces/eyes look toward the camera (-Y). Ground items (mushrooms, flower) have their origin at the bottom centre; floating items
(coin, star, fireball) at their centre."""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
from lib import asset, geo, rig
from lib.geo import ellipsoid, sphere, tube, lathe, rounded_disc, frame_from_z, ellipsoid_point, ellipsoid_normal, poly_prism, rot_xyz
from lib.bake import MatSpec, hexlin

BLACK, WHITE = (0.004, 0.004, 0.01), (0.9, 0.9, 0.92)
EYE = lambda: MatSpec('M_Eye', (1, 1, 1), rough=0.15, kind='smooth', vcol=True, bump=0.1, ao_albedo=0.1)


def mushroom(fname, cap_hex):
    P = []
    C, R = (0, 0, 0.62), (0.50, 0.50, 0.38)
    P.append(ellipsoid('cap', C, R, 'M_Cap', nu=36, nv=22, n=2.2, nz=2.0))
    P.append(ellipsoid('under', (0, 0, 0.36), (0.44, 0.44, 0.06), 'M_Stem', nu=28, nv=8))
    P.append(ellipsoid('stem', (0, 0, 0.20), (0.27, 0.27, 0.22), 'M_Stem', nu=24, nv=14))
    P.append(ellipsoid('base', (0, 0, 0.06), (0.30, 0.30, 0.07), 'M_Stem', nu=24, nv=8))
    for az, el, r in [(-90, 28, 0.17), (-35, 62, 0.12), (30, 40, 0.15), (150, 40, 0.15), (-150, 25, 0.13), (90, 30, 0.14), (0, 82, 0.13), (-90, 72, 0.10)]:
        p = ellipsoid_point(C, R, az, el, 2.2, 2.0)
        n = ellipsoid_normal(R, az, el, 2.2, 2.0)
        P.append(rounded_disc('spot', r, 0.05, 0.02, nu=20, steps=3, mat='M_Spot', domed=0.02).aim(p - n * 0.005, n))
    for sg in (1, -1):
        P.append(ellipsoid('eye', (sg * 0.075, -0.255, 0.22), (0.045, 0.03, 0.085), 'M_Eye', nu=14, nv=10, col=BLACK))
        P.append(ellipsoid('glint', (sg * 0.075 + 0.012, -0.28, 0.255), (0.012, 0.01, 0.02), 'M_Eye', nu=8, nv=5, col=(1, 1, 1)))
    specs = [MatSpec('M_Cap', hexlin(cap_hex), rough=0.45, kind='skin', bump=0.8), MatSpec('M_Spot', hexlin('#FAF7EE'), rough=0.5, kind='smooth'),
             MatSpec('M_Stem', hexlin('#F6E2B8'), rough=0.55, kind='skin', bump=0.7), EYE()]
    return asset.build(fname, P, specs, None, 512, None, seed=3)


def fire_flower():
    P = []
    P.append(tube('stem', np.array([[0, 0, 0.0], [0.02, 0, 0.25], [0, 0, 0.48]]), np.array([0.07, 0.065, 0.065]), nu=12, mat='M_Leaf', caps=(2, 2), bone='Stem'))
    for sg in (1, -1):
        lf = ellipsoid('leaf', (0, 0, 0), (0.22, 0.035, 0.09), 'M_Leaf', nu=14, nv=8, bone='Stem')
        lf.xf(rot_xyz(0, -sg * 25, 0), (sg * 0.20, 0, 0.17))
        P.append(lf)
    P.append(ellipsoid('pot', (0, 0, 0.5), (0.1, 0.1, 0.05), 'M_Leaf', nu=12, nv=6, bone='Head'))
    for k in range(8):   # outer petals (red) and inner ring (yellow)
        a = 2 * math.pi * k / 8
        c = np.array([0.31 * math.cos(a), 0, 0.72 + 0.31 * math.sin(a)])
        P.append(ellipsoid('petal', c, (0.15, 0.09, 0.15), 'M_PetalOut', nu=16, nv=10, bone='Head'))
        c2 = np.array([0.22 * math.cos(a + 0.4), -0.08, 0.72 + 0.22 * math.sin(a + 0.4)])
        P.append(ellipsoid('petal2', c2, (0.09, 0.05, 0.09), 'M_PetalIn', nu=12, nv=8, bone='Head'))
    P.append(ellipsoid('face', (0, -0.05, 0.72), (0.22, 0.15, 0.22), 'M_Face', nu=22, nv=14, bone='Head'))
    for sg in (1, -1):
        P.append(ellipsoid('eye', (sg * 0.075, -0.185, 0.76), (0.04, 0.03, 0.075), 'M_Eye', nu=12, nv=8, bone='Head', col=BLACK))
    P.append(ellipsoid('smile', (0, -0.19, 0.66), (0.07, 0.02, 0.025), 'M_Eye', nu=10, nv=6, bone='Head', col=(0.3, 0.05, 0.05)))
    specs = [MatSpec('M_Leaf', hexlin('#2E9A33'), rough=0.5, kind='smooth', bump=0.6), MatSpec('M_PetalOut', hexlin('#E8421A'), rough=0.45, kind='skin', bump=0.8),
             MatSpec('M_PetalIn', hexlin('#FFC83A'), rough=0.45, kind='skin', bump=0.8), MatSpec('M_Face', hexlin('#F8E4A8'), rough=0.5, kind='skin', bump=0.6), EYE()]
    bones = [('Root', None, (0, 0, 0), (0, 0, 0.1)), ('Stem', 'Root', (0, 0, 0.05), (0, 0, 0.5)), ('Head', 'Stem', (0, 0, 0.5), (0, 0, 1.0))]

    def clips(arm):
        R = rig.Rig(arm, loc_bones=('Root',))
        def sway(t):
            p = 2 * math.pi * t
            R.R('Stem', ry=5 * math.sin(p), rx=2 * math.sin(p + 1))
            R.R('Head', ry=6 * math.sin(p - 0.8), rz=4 * math.sin(p))
        R.clip('sway', 72, sway)
        return dict(sway=1.2)
    return asset.build('fire_flower', P, specs, bones, 512, clips, seed=4)


def star():
    pts = []
    for k in range(10):
        r = 0.50 if k % 2 == 0 else 0.25
        a = math.pi / 2 + k * math.pi / 5
        pts.append((r * math.cos(a), r * math.sin(a)))
    s = poly_prism('star', pts, 0.26, bevel=0.07, mat='M_Star', bevel_segs=4, bone='Spin')
    s.V[:, 2] -= 0.13
    s.xf(rot_xyz(90, 0, 0), (0, 0, 0))          # profile into the XZ plane, thickness along Y
    P = [s]
    for sg in (1, -1):
        P.append(ellipsoid('eye', (sg * 0.085, -0.14, 0.02), (0.04, 0.03, 0.09), 'M_Eye', nu=12, nv=8, bone='Spin', col=BLACK))
        P.append(ellipsoid('glint', (sg * 0.085 + 0.01, -0.165, 0.06), (0.012, 0.01, 0.025), 'M_Eye', nu=8, nv=5, bone='Spin', col=(1, 1, 1)))
    specs = [MatSpec('M_Star', hexlin('#FFC81E'), rough=0.3, metal=0.15, kind='smooth', bump=0.5, emissive=hexlin('#FF9A10'), emissive_strength=0.45), EYE()]
    bones = [('Root', None, (0, 0, -0.5), (0, 0, -0.4)), ('Spin', 'Root', (0, 0, 0), (0, 0, 0.5))]

    def clips(arm):
        R = rig.Rig(arm, loc_bones=('Root',))
        def spin(t):
            R.R('Spin', rz=-360 * t)
            R.L('Spin', 0, 0, 0.04 * math.sin(4 * math.pi * t))
        R.clip('spin', 60, spin)
        return dict(spin=1.0)
    return asset.build('star', P, specs, bones, 512, clips, seed=6)


def coin():
    def Y(p, loc=(0, 0, 0)):      # disc along Z -> disc in XZ plane facing -Y
        return p.xf(rot_xyz(90, 0, 0), loc).set(bone='Spin')
    P = [Y(rounded_disc('coin', 0.36, 0.10, 0.03, nu=40, steps=4, mat='M_Coin')),
         Y(lathe('rim', [(0.27, -0.065), (0.31, -0.07), (0.355, -0.04), (0.355, 0.04), (0.31, 0.07), (0.27, 0.065), (0.26, 0.0)], 40, 'M_Coin', cap=False)),
         ]
    for sg in (1, -1):    # embossed slot on both faces
        e = ellipsoid('slot', (0, sg * 0.055, 0), (0.06, 0.03, 0.19), 'M_Coin', nu=16, nv=10, bone='Spin')
        P.append(e)
    specs = [MatSpec('M_Coin', hexlin('#FFC21A'), rough=0.28, metal=0.95, kind='metal', bump=1.0, flat=False)]
    bones = [('Root', None, (0, 0, -0.5), (0, 0, -0.4)), ('Spin', 'Root', (0, 0, 0), (0, 0, 0.5))]

    def clips(arm):
        R = rig.Rig(arm, loc_bones=('Root',))
        R.clip('spin', 48, lambda t: R.R('Spin', rz=-360 * t))
        return dict(spin=0.8)
    return asset.build('coin', P, specs, bones, 256, clips, seed=8)


def fireball():
    P = [sphere('core', (0, 0, 0), 0.17, 'M_FireCore', nu=20, nv=12, bone='Spin')]
    for k in range(5):
        a = 2 * math.pi * k / 5
        d = np.array([math.cos(a), 0, math.sin(a)])
        f = ellipsoid('flame', (0, 0, 0), (0.13, 0.10, 0.20), 'M_Flame', nu=12, nv=8, bone='Spin')
        f.xf(geo.frame_from_z(d, up=(0, 1, 0)) @ rot_xyz(0, 0, 0), d * 0.17)
        f.V = f.V
        P.append(f)
    specs = [MatSpec('M_FireCore', (1, 0.9, 0.5), rough=0.5, kind='smooth', emissive=(1, 0.85, 0.35), emissive_strength=1.8, flat=True, ao_albedo=0, ao_strength=0),
             MatSpec('M_Flame', hexlin('#FF5A0A'), rough=0.5, kind='smooth', emissive=hexlin('#FF4A00'), emissive_strength=1.0, ao_albedo=0, ao_strength=0)]
    bones = [('Root', None, (0, 0, -0.3), (0, 0, -0.2)), ('Spin', 'Root', (0, 0, 0), (0, 0, 0.3))]

    def clips(arm):
        R = rig.Rig(arm, loc_bones=('Root',))
        R.clip('spin', 24, lambda t: R.R('Spin', ry=360 * t))
        return dict(spin=0.4)
    return asset.build('fireball', P, specs, bones, 256, clips, seed=9)


if __name__ == '__main__':
    mushroom('mushroom', '#E8222A'); mushroom('one_up', '#2EA83A'); fire_flower(); star(); coin(); fireball()
    json.dump(dict(mushroom=None, one_up=None, fire_flower='sway', star='spin', coin='spin', fireball='spin'), open(os.path.join(HERE, 'out', '_items.json'), 'w'))

"""Mario clips. All angles in degrees in ARMATURE AXES (see lib/rig.Rig). 60 fps authoring so every contract duration is an integer
number of frames. Legs are solved with an analytic planar 2-bone IK against a foot trajectory, so stance feet are planted exactly
(relative to the speed implied by the gait's stride length) - see GAITS below for the stride lengths the renderer needs.

Conventions (right-handed, +X forward, +Z up, character's right side = -Y = camera side):
  swing forward of a hanging limb  = rotation about Y by -angle        torso lean forward = +ry
  foot pitch psi (toe up positive)  = ry = -psi + shin_world_angle     elbow flexion e (forearm forward/up) = ry = -e
"""
import math

import numpy as np

from lib import rig
from mario_skel import *

FPS = 60
D = math.degrees
FOOT_H = np.array([-0.13, -0.15])     # heel contact point relative to the ankle (flat foot)
FOOT_B = np.array([0.25, -0.15])      # ball contact point
LMAX = 0.97 * (L1 + L2)


def sm(a, b, x):
    t = min(max((x - a) / (b - a + 1e-12), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def cosblend(a, b, u):
    return a + (b - a) * (0.5 - 0.5 * math.cos(math.pi * min(max(u, 0.0), 1.0)))


def rot2(psi, p):
    c, s = math.cos(psi), math.sin(psi)
    return np.array([c * p[0] - s * p[1], s * p[0] + c * p[1]])


def ik(dx, dz):
    """Ankle target (dx, dz) relative to the hip joint, knee pointing forward. Returns thigh and shin WORLD angles (rad,
    measured from straight down toward +x)."""
    Dd = min(math.hypot(dx, dz), (L1 + L2) * 0.9995)
    Dd = max(Dd, abs(L1 - L2) + 1e-3)
    base = math.atan2(dx, -dz)
    A = math.acos(min(1.0, max(-1.0, (L1 * L1 + Dd * Dd - L2 * L2) / (2 * L1 * Dd))))
    a1 = base + A
    kx, kz = L1 * math.sin(a1), -L1 * math.cos(a1)
    a2 = math.atan2(dx - kx, -(dz - kz))
    return a1, a2


def set_leg(R, side, ax, az, psi_deg):
    """ankle target (ax, az) relative to the hip joint (az < 0 below), foot pitch psi (deg, toe up positive, world)."""
    a1, a2 = ik(ax, az)
    R.R('Thigh.' + side, ry=-D(a1))
    R.R('Shin.' + side, ry=-D(a2 - a1))
    R.R('Foot.' + side, ry=-psi_deg + D(a2))


def set_arm(R, side, fa, e, ab=0.0, hand=0.0, twist=0.0):
    """fa = shoulder swing forward (deg), e = elbow flexion, ab = abduction (outward, deg), hand = wrist flex."""
    sg = 1 if side == 'L' else -1
    R.R('UpperArm.' + side, rx=sg * ab, ry=-fa, rz=sg * twist)
    R.R('Forearm.' + side, ry=-e)
    R.R('Hand.' + side, ry=-hand)


# ----------------------------------------------------------------------------- gait
class Gait:
    """S = stride (tiles travelled per cycle), beta = stance fraction. All lengths in tiles."""

    def __init__(self, S, beta, zmean, bob, lift, psi_hs, psi_to, flat=(0.16, 0.56), swing_clear=0.0):
        self.S, self.beta, self.zmean, self.bob, self.lift = S, beta, zmean, bob, lift
        self.psi_hs, self.psi_to, self.flat = math.radians(psi_hs), math.radians(psi_to), flat
        self.uc = 0.5 * (flat[0] + flat[1])
        self.tm = self.uc * beta                      # mid-stance phase of the left leg

    def stance(self, phi):
        u = phi / self.beta
        f0, f1 = self.flat
        if u < f0:
            psi, piv = self.psi_hs * (1 - sm(0, f0, u)), FOOT_H
        elif u < f1:
            psi, piv = 0.0, None
        else:
            psi, piv = self.psi_to * sm(f1, 1, u), FOOT_B
        Af = np.array([self.S * self.beta * (self.uc - u), ANKLE_Z])
        if piv is not None:
            Af = Af + piv - rot2(psi, piv)
        return Af[0], Af[1], psi

    def leg(self, phi):
        """ankle (x relative to the hip x, z world) and foot pitch for leg phase phi in [0,1)."""
        phi = phi % 1.0
        if phi < self.beta:
            return self.stance(phi)
        s = (phi - self.beta) / (1 - self.beta)
        xs, zs, ps = self.stance(self.beta - 1e-6)
        xe, ze, pe = self.stance(0.0)
        xe_adj = xe + self.S                    # body travels S during the cycle: the next foot placement is S ahead in the world
        # hermite in the body frame; end slope matches the ground (planted foot) so the foot arrives with zero world velocity
        T = (1 - self.beta)
        m0 = -self.S * T * 0.25
        m1 = -self.S * T
        h00, h10, h01, h11 = 2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2
        x = h00 * xs + h10 * m0 + h01 * (xe + 0.0) + h11 * m1
        # the hermite above lives in the (body) frame where the foot must travel xs -> xe over the swing; xe already includes S via frame
        z = zs + (ze - zs) * sm(0, 1, s) + self.lift * math.sin(math.pi * s ** 0.85) ** 1.1
        k = [0.0, 0.18, 0.5, 0.85, 1.0]
        pv = [ps, math.radians(-6), math.radians(4), pe * 0.8, pe]
        psi = float(np.interp(s, k, pv))
        return x, z, psi

    def hip_z(self, t):
        nominal = self.zmean - self.bob * math.cos(4 * math.pi * (t - self.tm))
        lim = 9.0
        for off in (0.0, 0.5):
            x, z, _ = self.leg(t + off)
            if abs(x) < LMAX:
                lim = min(lim, z + math.sqrt(LMAX * LMAX - x * x))
        return min(nominal, lim)

    def hip_z_smooth(self, t, w=0.012):
        return sum(self.hip_z(t + k * w) for k in (-2, -1, 0, 1, 2)) / 5.0


# stride (tiles per cycle) for the renderer: set timeScale = speed_tiles_per_s * cycle_seconds / stride
GAITS = dict(
    walk=dict(T=1.0, gait=Gait(S=1.05, beta=0.62, zmean=0.775, bob=0.022, lift=0.075, psi_hs=17, psi_to=-30)),
    run=dict(T=0.6, gait=Gait(S=2.10, beta=0.34, zmean=0.70, bob=0.055, lift=0.25, psi_hs=6, psi_to=-42, flat=(0.10, 0.50))),
)


def gait_pose(R, name, t, lean, arm_amp, elbow, spine_twist, arm_ab=6.0):
    G = GAITS[name]['gait']
    hz = G.hip_z_smooth(t)
    R.L('Hips', 0.0, 0.0, hz - HIP_Z)
    for side, off in (('L', 0.0), ('R', 0.5)):
        x, z, psi = G.leg(t + off)
        set_leg(R, side, x, z - hz - 0.0, D(psi))
        # shoulders: arm opposite to the same-side leg
    c = math.cos(2 * math.pi * t)
    sn = math.sin(2 * math.pi * t)
    # left leg forward at t=0 -> left arm back (negative swing); right arm forward
    fa_l, fa_r = -arm_amp * c + 4, arm_amp * c + 4
    for side, fa in (('L', fa_l), ('R', fa_r)):
        e = elbow[0] + elbow[1] * (0.5 + 0.5 * fa / max(arm_amp, 1e-6))
        set_arm(R, side, fa, e, ab=arm_ab)
    R.R('Spine', ry=lean, rz=spine_twist * c)
    R.R('Head', ry=-lean * 0.6, rz=-spine_twist * c * 0.6)
    return G


def clip_walk(R):
    return lambda t: gait_pose(R, 'walk', t, lean=4.0, arm_amp=24.0, elbow=(14.0, 26.0), spine_twist=-5.0)


def clip_run(R):
    def f(t):
        gait_pose(R, 'run', t, lean=13.0, arm_amp=48.0, elbow=(50.0, 35.0), spine_twist=-9.0, arm_ab=2.0)
        R.R('Head', ry=-8.0, rz=0.0)
    return f


# ----------------------------------------------------------------------------- single pose helpers
def stand_legs(R, hz=0.775, spread=0.0, foot_x=0.0):
    R.L('Hips', 0, 0, hz - HIP_Z)
    for side in 'LR':
        set_leg(R, side, foot_x, ANKLE_Z - hz, 0.0)


def clip_idle(R):
    def f(t):
        p = 2 * math.pi * t
        br = math.sin(p)
        stand_legs(R, 0.785 + 0.004 * br)
        R.R('Spine', ry=-1.4 * br + 1.0, rx=1.2 * math.sin(p + 1.2))
        R.R('Head', ry=0.9 * math.sin(p - 0.6) - 1.0, rz=2.5 * math.sin(p + 2.0), rx=-1.0 * math.sin(p))
        for side, ph in (('L', 0.0), ('R', 0.9)):
            set_arm(R, side, 3 + 2 * math.sin(p + ph), 16 + 2.5 * br, ab=3.5 + 1.2 * br, hand=-4)
    return f


def clip_skid(R):
    def f(t):
        hz = 0.66
        R.L('Hips', -0.12, 0, hz - HIP_Z)
        set_leg(R, 'R', 0.46, ANKLE_Z + 0.04 - hz, 18)      # near leg stretched out in front, heel down
        set_leg(R, 'L', 0.20, ANKLE_Z - hz, 4)
        R.R('Spine', ry=-17, rz=6)
        R.R('Head', ry=-8, rz=-8)
        set_arm(R, 'R', 42, 10, ab=42)                        # near arm thrown out/forward, below the face
        set_arm(R, 'L', -58, 20, ab=30)                       # far arm swings back
    return f


def clip_jump(R):
    def f(t):
        hz = 0.74
        R.L('Hips', 0.0, 0, hz - HIP_Z + 0.02)
        set_leg(R, 'R', 0.36, -0.40, -22)                    # near knee driven up and forward
        set_leg(R, 'L', -0.26, -0.50, -50)                   # trailing leg
        R.R('Spine', ry=7, rz=-6)
        R.R('Head', ry=-9, rz=5)
        set_arm(R, 'R', 168, 6, ab=10)                       # near fist punches straight up
        set_arm(R, 'L', -32, 50, ab=14)
    return f


def clip_fall(R):
    def f(t):
        hz = 0.77
        R.L('Hips', 0.0, 0, hz - HIP_Z + 0.015)
        set_leg(R, 'R', 0.18, -0.56, -18)
        set_leg(R, 'L', -0.15, -0.58, -28)
        R.R('Spine', ry=-2)
        R.R('Head', ry=-10)
        set_arm(R, 'R', 62, 20, ab=34)
        set_arm(R, 'L', 128, 12, ab=34)
    return f


def clip_duck(R):
    def f(t):
        hz = 0.42
        R.L('Hips', -0.12, 0, hz - HIP_Z)
        for side in 'LR':
            set_leg(R, side, 0.11 + 0.12, ANKLE_Z - hz, 0)
        R.R('Spine', ry=28)
        R.R('Head', ry=-12)
        set_arm(R, 'R', 38, 38, ab=2)
        set_arm(R, 'L', 30, 44, ab=2)
    return f


def clip_swim(R):
    def f(t):
        p = 2 * math.pi * t
        R.L('Hips', 0.0, 0.0, 0.0)
        R.R('Hips', ry=38)
        R.R('Spine', ry=6, rz=5 * math.sin(p))
        R.R('Head', ry=-34 - 3 * math.sin(2 * p), rz=-4 * math.sin(p))
        for side, ph in (('R', 0.0), ('L', math.pi)):
            s = math.sin(p + ph)
            c = math.cos(p + ph)
            # flutter kick: thigh swings, knee lags (the pitched hips already trail the legs)
            R.R('Thigh.' + side, ry=-(16 * s) + 4)
            R.R('Shin.' + side, ry=-(30 + 26 * math.sin(p + ph - 1.1)))
            R.R('Foot.' + side, ry=14 + 12 * math.sin(p + ph - 2.0))
            # paddle stroke
            set_arm(R, side, 85 + 55 * math.sin(p + ph + 0.4), 12 + 22 * (0.5 + 0.5 * math.cos(p + ph + 0.4)), ab=34 + 14 * c)
    return f


def clip_climb(R):
    def f(t):
        p = 2 * math.pi * t
        hz = 0.76 + 0.012 * math.cos(2 * p)
        R.L('Hips', 0.0, 0, hz - HIP_Z)
        R.R('Spine', ry=9, rz=3 * math.sin(p))
        R.R('Head', ry=-14 - 2 * math.sin(p), rz=-3 * math.sin(p))
        for side, ph in (('R', 0.0), ('L', math.pi)):
            s = math.sin(p + ph)
            # arm reaches up (s>0) then pulls down; hand stays ahead of the chest where the pole is
            fa = 115 + 55 * s
            e = 25 - 15 * s
            set_arm(R, side, fa, e, ab=-8 - 5 * s)
            # leg: knee up when the same side's hand is low (pulling), alternating
            k = 0.5 - 0.5 * s
            x = 0.30 * k + 0.02
            z = -0.62 + 0.28 * k
            set_leg(R, side, x, z, -25 * k)
    return f


def clip_slide(R):
    def f(t):
        hz = 0.74
        R.L('Hips', -0.02, 0, hz - HIP_Z)
        set_leg(R, 'R', 0.30, -0.54, -10)
        set_leg(R, 'L', 0.20, -0.57, -10)
        R.R('Spine', ry=8)
        R.R('Head', ry=10, rz=0)
        set_arm(R, 'R', 66, 34, ab=-6, hand=10)              # near hand grips the pole at chest height
        set_arm(R, 'L', 132, 30, ab=-8, hand=10)             # far hand higher, behind the head
    return f


def clip_death(R):
    def f(t):
        hz = 0.775
        R.R('Root', rz=-62)                                  # turns to the camera (rotation about the feet, no translation)
        R.L('Hips', 0.0, 0, hz - HIP_Z + 0.015)
        set_leg(R, 'R', 0.22, -0.58, -22)
        set_leg(R, 'L', -0.17, -0.60, -30)
        R.R('Spine', ry=-9)
        R.R('Head', ry=-22)
        set_arm(R, 'R', 160, 12, ab=40)
        set_arm(R, 'L', 160, 12, ab=40)
    return f


def clip_throw(R):
    def f(t):
        # 0..0.3 wind up (arm back, torso twists away), 0.3..0.55 release, then settle
        stand_legs(R, 0.775)
        w = sm(0.0, 0.3, t) * (1 - sm(0.3, 0.5, t))
        rel = sm(0.3, 0.5, t) * (1 - sm(0.6, 1.0, t))
        R.R('Spine', ry=2 + 6 * rel, rz=18 * w - 16 * rel)
        R.R('Head', ry=-3, rz=-10 * w + 8 * rel)
        set_arm(R, 'R', -55 * w + 105 * rel + 6, 62 * w + 20 * rel + 14, ab=6)
        set_arm(R, 'L', 14 * w - 10 * rel, 24, ab=8)
    return f


def clip_victory(R):
    def f(t):
        p = 2 * math.pi * t
        b = 0.5 - 0.5 * math.cos(2 * p)                    # 0 = crouched, 1 = stretched
        hz = 0.70 + 0.10 * b
        R.R('Root', rz=-42)
        R.L('Hips', 0.0, 0, hz - HIP_Z)
        for side in 'LR':
            set_leg(R, side, 0.02, ANKLE_Z - hz + 0.02 * b, 0 - 10 * (1 - b))
        R.R('Spine', ry=-3 + 4 * (1 - b), rz=6 * math.sin(p))
        R.R('Head', ry=-8 + 8 * (1 - b), rz=-8 * math.sin(p))
        for side, ph in (('R', 0.0), ('L', math.pi)):
            s = 0.5 + 0.5 * math.sin(p + ph)
            set_arm(R, side, 160 * s + 5, 14 + 30 * (1 - s), ab=10 + 26 * s)
    return f


CLIPS = [  # name, seconds, loop, builder
    ('idle', 2.0, True, clip_idle), ('walk', 1.0, True, clip_walk), ('run', 0.6, True, clip_run),
    ('skid', 0.2, False, clip_skid), ('jump', 0.2, False, clip_jump), ('fall', 0.2, False, clip_fall),
    ('duck', 0.2, False, clip_duck), ('swim', 0.8, True, clip_swim), ('climb', 0.8, True, clip_climb),
    ('slide', 0.2, False, clip_slide), ('death', 0.2, False, clip_death), ('throw', 0.25, False, clip_throw),
    ('victory', 1.0, True, clip_victory)]


def add_clips(arm_obj, only=None):
    import bpy
    bpy.context.scene.render.fps = FPS
    R = rig.Rig(arm_obj)
    info = {}
    for name, secs, loop, builder in CLIPS:
        if only and name not in only:
            continue
        n = int(round(secs * FPS))
        R.clip(name, n, builder(R), loop=loop)
        info[name] = secs
    return info

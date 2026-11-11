"""Numeric foot-contact check on the exported out/mario.glb. Usage: run.sh check_gait.py"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy, numpy as np
from lib import preview
from mario_skel import *
from mario_clips import GAITS, FOOT_H, FOOT_B

arm, meshes = preview.load_glb(os.path.join(HERE, 'out', 'mario.glb'))
def contact_pts(side, clip, t):
    preview.set_clip(arm, clip, t)
    pb = arm.pose.bones['Foot.' + side]
    bn = arm.data.bones['Foot.' + side]
    M = arm.matrix_world @ pb.matrix
    Mr = arm.matrix_world @ bn.matrix_local
    Dt = np.array(M.to_3x3()) @ np.linalg.inv(np.array(Mr.to_3x3()))
    head = np.array(M.translation)
    # rest ankle in world = Mr.translation ; offsets are expressed in the (axis aligned) rest frame
    res = {}
    for nm, off in (('heel', FOOT_H), ('ball', FOOT_B)):
        res[nm] = head + Dt @ np.array([off[0], 0.0, off[1]])
    return res, head

for clip, T in (('walk', 1.0), ('run', 0.6)):
    G = GAITS[clip]['gait']
    S = G.S
    N = 60
    for side in 'LR':
        for nm in ('heel', 'ball'):
            pl = []
            for i in range(2 * N):               # two cycles, cumulative travel S per cycle
                t = i / N
                pts, head = contact_pts(side, clip, t % 1.0)
                if pts[nm][2] < 0.004:
                    pl.append((i, pts[nm][0] + S * t))
            groups, cur = [], [pl[0]]
            for p in pl[1:]:
                if p[0] == cur[-1][0] + 1: cur.append(p)
                else: groups.append(cur); cur = [p]
            groups.append(cur)
            for g in groups:
                if g[0][0] == 0 or g[-1][0] == 2 * N - 1:
                    continue
                xs_ = [p[1] for p in g]
                print(f'{clip} {side} {nm}: grounded {len(g)/N:.2f} of cycle, world-x slip while grounded = {max(xs_)-min(xs_):.4f} tiles (stride {S})')
                break
    allz = []
    for i in range(N):
        for side in 'LR':
            pts, _ = contact_pts(side, clip, i / N)
            allz.append(min(pts['heel'][2], pts['ball'][2]))
    print(f'{clip}: lowest sole point over cycle min={min(allz):.4f} max={max(allz):.3f} (0 = ground)')

"""One-call asset builder: parts -> mesh -> (armature + skin) -> bake atlas -> final materials -> clips -> glb."""
import os

import bpy

from . import bake, geo, rig

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
CACHE = os.path.join(ROOT, '.cache25d', 'bake')
STATS = {}


def new_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig.set_fps()
    bpy.context.scene.render.fps = 60


def mesh_object(name, parts, specs, bone_names=None, size=512, ao_samples=96, seed=1):
    """Assemble + bake + finalize one mesh object. Returns (obj, weight matrix)."""
    from . import realism
    realism.apply(name, specs)
    order = [s.name for s in specs]
    obj, W = geo.assemble(parts, name, order, bones=bone_names)
    STATS[name] = dict(tris=sum(p.tri_count() for p in parts), tex=size)
    res = bake.bake_asset(obj, specs, name, size, os.path.join(CACHE, name), ao_samples=ao_samples, seed=seed)
    bake.finalize(obj, specs, res)
    return obj, W


def build(fname, parts, specs, bones=None, size=512, clips=None, extra=None, ao_samples=96, seed=1):
    """bones: list of (name, parent, head, tail) or None for a static mesh. clips(arm) adds actions via rig.Rig.
    extra(arm, obj) may add more objects; returns list of extra objects to export."""
    new_scene()
    arm = rig.make_armature(fname, bones) if bones else None
    names = [b[0] for b in bones] if bones else None
    obj, W = mesh_object(fname, parts, specs, names, size, ao_samples, seed)
    objs = [obj]
    if arm:
        rig.skin_to(obj, arm)
        objs.append(arm)
    more = extra(arm, obj) if extra else []
    for o in more:
        objs.append(o)
        if arm:
            rig.skin_to(o, arm)
    if clips and arm:
        STATS[fname]['clips'] = clips(arm)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, fname + '.glb')
    rig.export_glb(path, objs, anim=bool(arm))
    STATS[fname]['bytes'] = os.path.getsize(path)
    print('BUILT', fname, STATS[fname])
    return path


# ----------------------------------------------------------------------------- small shared helpers for characters
import numpy as _np
from .geo import ellipsoid as _ell, lathe as _lathe

WHITE, BLACK = (0.85, 0.86, 0.88), (0.004, 0.004, 0.01)


def eye_pair(P, c, fwd, sep, r, bone=None, mat='M_Eye', pupil=0.36, look=0.15):
    """Two eyes centred at c, looking along fwd, spaced +-sep sideways. Eye colours come from vertex colours (M_Eye vcol)."""
    fwd = _np.asarray(fwd, float); fwd = fwd / _np.linalg.norm(fwd)
    side = _np.cross([0, 0, 1.0], fwd)
    side = side / (_np.linalg.norm(side) + 1e-9) if _np.linalg.norm(side) > 1e-6 else _np.array([0, 1.0, 0])
    for sg in (1, -1):
        p = _np.asarray(c, float) + side * sg * sep
        P.append(_ell('eye', (0, 0, 0), (r * 0.78, r * 1.05, r * 0.5), mat, nu=16, nv=10, bone=bone, col=WHITE).aim(p, fwd))
        P.append(_ell('pupil', (0, 0, 0), (r * pupil, r * pupil * 1.7, r * 0.3), mat, nu=12, nv=8, bone=bone, col=BLACK)
                 .aim(p + fwd * r * 0.32 - side * sg * r * look, fwd))


def cone(name, base, tip, r, mat, bone=None, nu=12, col=(1, 1, 1)):
    base, tip = _np.asarray(base, float), _np.asarray(tip, float)
    h = _np.linalg.norm(tip - base)
    p = _lathe(name, [(0, 0), (r, 0), (r * 0.8, h * 0.25), (r * 0.35, h * 0.7), (0.0, h)], nu, mat, cap=False, bone=bone, col=col)
    return p.aim(base, tip - base)


def clipset(arm, defs, loc_bones=('Root',)):
    """defs: {name: (seconds, fn(R, t))} -> keyed clips at 60 fps; returns {name: seconds}."""
    R = rig.Rig(arm, loc_bones=loc_bones)
    out = {}
    for name, (secs, fn) in defs.items():
        R.clip(name, int(round(secs * 60)), (lambda f: (lambda t: f(R, t)))(fn))
        out[name] = secs
    return out

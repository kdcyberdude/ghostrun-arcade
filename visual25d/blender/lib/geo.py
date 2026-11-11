"""Numpy part geometry for the 2.5D asset kit.

A Part is a polygon soup (usually a closed solid) with a material name, a per-part vertex colour and skin weights.
Parts are cheap to generate, overlap freely (stylised characters are built from overlapping rounded solids), and are
assembled into ONE Blender mesh by `assemble()` (material slots, 'Col' attribute, vertex groups, sharp edges).

Blender authoring axes: +X forward (character faces +X), +Z up, camera-facing side -Y.
"""
import math
import numpy as np


# ----------------------------------------------------------------------------- small maths helpers
def rot_xyz(rx=0.0, ry=0.0, rz=0.0):
    """3x3 rotation, degrees, applied X then Y then Z (extrinsic), like Blender XYZ euler."""
    ax, ay, az = map(math.radians, (rx, ry, rz))
    cx, sx, cy, sy, cz, sz = math.cos(ax), math.sin(ax), math.cos(ay), math.sin(ay), math.cos(az), math.sin(az)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def frame_from_z(zdir, up=(0.0, 0.0, 1.0)):
    """3x3 whose third column is zdir, x column perpendicular (uses `up` as hint)."""
    z = np.asarray(zdir, float)
    z = z / (np.linalg.norm(z) + 1e-12)
    up = np.asarray(up, float)
    if abs(np.dot(z, up)) > 0.98:
        up = np.array([1.0, 0.0, 0.0])
    x = np.cross(up, z)
    x /= np.linalg.norm(x) + 1e-12
    y = np.cross(z, x)
    return np.stack([x, y, z], axis=1)


def smoothstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a + 1e-12), 0.0, 1.0)
    return t * t * (3 - 2 * t)


class Part:
    def __init__(self, name, V, F, mat, col=(1.0, 1.0, 1.0), bone=None, weights=None, sharp=None):
        self.name = name
        self.V = np.asarray(V, float).reshape(-1, 3).copy()
        self.F = [tuple(int(i) for i in f) for f in F]
        self.mat = mat
        self.col = tuple(col)
        self.bone = bone          # rigid bone name (weight 1) unless weights given
        self.weights = weights    # callable(V)->dict bone->(n,) array   OR dict
        self.sharp = sharp        # edge angle in degrees above which an edge is sharp; None = all smooth
        self.recalc = True        # False for open/one-sided surfaces whose winding is already outward

    # --- transforms (return self for chaining)
    def xf(self, R=None, t=(0, 0, 0), s=1.0):
        V = self.V
        if np.isscalar(s):
            V = V * s
        else:
            V = V * np.asarray(s, float)
        if R is not None:
            V = V @ np.asarray(R, float).T
        self.V = V + np.asarray(t, float)
        return self

    def place(self, loc=(0, 0, 0), rot=(0, 0, 0), s=1.0):
        return self.xf(rot_xyz(*rot), loc, s)

    def aim(self, loc, zdir, up=(0, 0, 1), s=1.0):
        return self.xf(frame_from_z(zdir, up), loc, s)

    def deform(self, fn):
        """fn(V)->V' (vertex array in, vertex array out)."""
        self.V = np.asarray(fn(self.V), float)
        return self

    def set(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)
        return self

    def mirrored(self, suffix='.R', bone_map=None, axis=1):
        """Copy mirrored across the XZ plane (y -> -y) with flipped winding."""
        p = Part(self.name + suffix, self.V.copy(), [f[::-1] for f in self.F], self.mat, self.col, self.bone, self.weights, self.sharp)
        p.recalc = self.recalc
        p.V[:, axis] *= -1
        if bone_map:
            if p.bone in bone_map:
                p.bone = bone_map[p.bone]
            if isinstance(p.weights, dict):
                p.weights = {bone_map.get(k, k): v for k, v in p.weights.items()}
            elif callable(p.weights):
                f = p.weights
                p.weights = (lambda V, f=f, bm=bone_map: {bm.get(k, k): v for k, v in f(V).items()})
        return p

    def tri_count(self):
        return sum(len(f) - 2 for f in self.F)


def L_to_R(name):
    return name[:-2] + '.R' if name.endswith('.L') else name


# ----------------------------------------------------------------------------- primitives
def _uvsphere(nu, nv):
    V = [(0, 0, 1.0)]
    for j in range(1, nv):
        el = math.pi * j / nv
        for i in range(nu):
            az = 2 * math.pi * i / nu
            V.append((math.sin(el) * math.cos(az), math.sin(el) * math.sin(az), math.cos(el)))
    V.append((0, 0, -1.0))
    F = [(0, 1 + (i + 1) % nu, 1 + i) for i in range(nu)]
    for j in range(nv - 2):
        a, b = 1 + j * nu, 1 + (j + 1) * nu
        for i in range(nu):
            F.append((a + i, a + (i + 1) % nu, b + (i + 1) % nu, b + i))
    last = len(V) - 1
    base = 1 + (nv - 2) * nu
    F += [(last, base + i, base + (i + 1) % nu) for i in range(nu)]
    return np.array(V), F


def ellipsoid(name, c=(0, 0, 0), r=(1, 1, 1), mat='M_Skin', nu=24, nv=14, n=2.0, nz=None, rot=(0, 0, 0), **kw):
    """(Super)ellipsoid. n = squareness in the xy directions, nz = along z (defaults to n). n=2 is a plain ellipsoid."""
    V, F = _uvsphere(nu, nv)
    nz = n if nz is None else nz
    if n != 2.0 or nz != 2.0:
        ex, ez = 2.0 / n, 2.0 / nz
        V = np.stack([np.sign(V[:, 0]) * np.abs(V[:, 0]) ** ex, np.sign(V[:, 1]) * np.abs(V[:, 1]) ** ex,
                      np.sign(V[:, 2]) * np.abs(V[:, 2]) ** ez], axis=1)
    p = Part(name, V * np.asarray(r, float), F, mat, **kw)
    return p.xf(rot_xyz(*rot), c)


def sphere(name, c, r, mat='M_Skin', nu=20, nv=12, **kw):
    return ellipsoid(name, c, (r, r, r), mat, nu, nv, **kw)


def lathe(name, profile, nu=24, mat='M_Skin', cap=True, **kw):
    """Revolve profile [(radius, z), ...] (bottom -> top) around +Z. Radius 0 produces a pole. cap=True closes open ends flat."""
    prof = [(float(r), float(z)) for r, z in profile]
    V, rings = [], []
    for r, z in prof:
        if r < 1e-9:
            V.append((0, 0, z)); rings.append(('p', len(V) - 1))
        else:
            s = len(V)
            for i in range(nu):
                a = 2 * math.pi * i / nu
                V.append((r * math.cos(a), r * math.sin(a), z))
            rings.append(('r', s))
    F = []
    for k in range(len(rings) - 1):
        (ta, a), (tb, b) = rings[k], rings[k + 1]
        for i in range(nu):
            j = (i + 1) % nu
            if ta == 'p' and tb == 'r':
                F.append((a, b + j, b + i))
            elif ta == 'r' and tb == 'p':
                F.append((a + i, a + j, b))
            elif ta == 'r' and tb == 'r':
                F.append((a + i, a + j, b + j, b + i))
    if cap:
        if rings[0][0] == 'r':
            V.append((0, 0, prof[0][1])); c0 = len(V) - 1
            F += [(c0, rings[0][1] + i, rings[0][1] + (i + 1) % nu) for i in range(nu)]
        if rings[-1][0] == 'r':
            V.append((0, 0, prof[-1][1])); c1 = len(V) - 1
            F += [(c1, rings[-1][1] + (i + 1) % nu, rings[-1][1] + i) for i in range(nu)]
    return Part(name, V, F, mat, **kw)


def rounded_disc(name, radius, height, bevel, nu=24, mat='M_Skin', domed=0.0, steps=4, **kw):
    """Coin / button / disc along +Z (centred at z=0). bevel = edge rounding radius. domed raises the front face centre."""
    h = height / 2.0
    b = min(bevel, h * 0.999, radius * 0.5)
    prof = [(0, -h)]
    for k in range(steps + 1):
        a = math.pi / 2 * k / steps
        prof.append((radius - b + b * math.sin(a), -h + b - b * math.cos(a)))
    for k in range(steps + 1):
        a = math.pi / 2 * k / steps
        prof.append((radius - b + b * math.cos(a), h - b + b * math.sin(a)))
    prof.append((radius * 0.5, h + domed * 0.6))
    prof.append((0, h + domed))
    return lathe(name, prof, nu, mat, **kw)


def _frames(path, up):
    path = np.asarray(path, float)
    n = len(path)
    t = np.zeros_like(path)
    t[1:-1] = path[2:] - path[:-2]
    t[0] = path[1] - path[0]
    t[-1] = path[-1] - path[-2]
    t /= np.linalg.norm(t, axis=1, keepdims=True) + 1e-12
    up = np.asarray(up, float)
    N, B = np.zeros_like(path), np.zeros_like(path)
    nvec = np.cross(up, t[0])
    if np.linalg.norm(nvec) < 1e-6:
        nvec = np.cross([1.0, 0, 0], t[0])
    nvec /= np.linalg.norm(nvec)
    for i in range(n):
        if i > 0:
            nvec = nvec - np.dot(nvec, t[i]) * t[i]
            nvec /= np.linalg.norm(nvec) + 1e-12
        N[i] = nvec
        B[i] = np.cross(t[i], nvec)
    return t, N, B


def tube(name, path, radii, nu=12, mat='M_Skin', caps=(3, 3), up=(0, 0, 1), **kw):
    """Sweep an elliptical section along a polyline with round caps. radii: (n,) or (n,2) = (radius along N, radius along B).
    N = up x tangent, so for a path running along +X with up=+Z, N is -Y... use up to orient flat sections."""
    path = np.asarray(path, float)
    radii = np.asarray(radii, float)
    if radii.ndim == 1:
        radii = np.stack([radii, radii], axis=1)
    t, N, B = _frames(path, up)
    rings = []   # (centre, scaleN, scaleB, Nvec, Bvec)
    cs, ce = caps
    for k in range(cs, 0, -1):
        phi = (k / cs) * math.pi / 2 if cs else 0
        rm = radii[0].mean()
        rings.append((path[0] - t[0] * rm * math.sin(phi), radii[0] * math.cos(phi), N[0], B[0]))
    for i in range(len(path)):
        rings.append((path[i], radii[i], N[i], B[i]))
    for k in range(1, ce + 1):
        phi = (k / ce) * math.pi / 2
        rm = radii[-1].mean()
        rings.append((path[-1] + t[-1] * rm * math.sin(phi), radii[-1] * math.cos(phi), N[-1], B[-1]))
    V, idx = [], []
    angs = [2 * math.pi * i / nu for i in range(nu)]
    first_pole = cs > 0
    if cs:
        V.append(path[0] - t[0] * radii[0].mean())
        idx.append(('p', 0))
    for c, rr, Nv, Bv in rings:
        if rr.max() < 1e-6:
            continue
        s = len(V)
        for a in angs:
            V.append(c + Nv * rr[0] * math.cos(a) + Bv * rr[1] * math.sin(a))
        idx.append(('r', s))
    if ce:
        V.append(path[-1] + t[-1] * radii[-1].mean())
        idx.append(('p', len(V) - 1))
    F = []
    for k in range(len(idx) - 1):
        (ta, a), (tb, b) = idx[k], idx[k + 1]
        for i in range(nu):
            j = (i + 1) % nu
            if ta == 'p' and tb == 'r':
                F.append((a, b + i, b + j))
            elif ta == 'r' and tb == 'p':
                F.append((a + j, a + i, b))
            else:
                F.append((a + i, b + i, b + j, a + j))
    if not cs:
        s = idx[0][1]
        V.append(path[0]); c0 = len(V) - 1
        F += [(c0, s + (i + 1) % nu, s + i) for i in range(nu)]
    if not ce:
        s = idx[-1][1]
        V.append(path[-1]); c1 = len(V) - 1
        F += [(c1, s + i, s + (i + 1) % nu) for i in range(nu)]
    return Part(name, V, F, mat, **kw)


def grid_solid(A, B, wrap_u=False, name='shell', mat='M_Skin', **kw):
    """Closed solid between two same-shaped grids A (outer) and B (inner): arrays (nv, nu, 3). Open sides are sealed by rims."""
    A, B = np.asarray(A, float), np.asarray(B, float)
    nv, nu = A.shape[:2]
    V = np.concatenate([A.reshape(-1, 3), B.reshape(-1, 3)])
    off = nv * nu
    ix = lambda j, i: j * nu + i
    F = []
    ul = nu if wrap_u else nu - 1
    for j in range(nv - 1):
        for i in range(ul):
            i2 = (i + 1) % nu
            F.append((ix(j, i), ix(j + 1, i), ix(j + 1, i2), ix(j, i2)))
            F.append((off + ix(j, i), off + ix(j, i2), off + ix(j + 1, i2), off + ix(j + 1, i)))
    for i in range(ul):        # rims at v=0 and v=nv-1
        i2 = (i + 1) % nu
        F.append((ix(0, i), ix(0, i2), off + ix(0, i2), off + ix(0, i)))
        F.append((ix(nv - 1, i2), ix(nv - 1, i), off + ix(nv - 1, i), off + ix(nv - 1, i2)))
    if not wrap_u:
        for j in range(nv - 1):
            F.append((ix(j + 1, 0), ix(j, 0), off + ix(j, 0), off + ix(j + 1, 0)))
            F.append((ix(j, nu - 1), ix(j + 1, nu - 1), off + ix(j + 1, nu - 1), off + ix(j, nu - 1)))
    return Part(name, V, F, mat, **kw)


def ellipsoid_point(c, r, az, el, n=2.0, nz=None):
    """Point on a (super)ellipsoid at azimuth az (0 = +X, 90 = +Y) and elevation el (degrees; 90 = +Z). Arrays ok."""
    az, el = np.radians(az), np.radians(el)
    nz = n if nz is None else nz
    x, y, z = np.cos(el) * np.cos(az), np.cos(el) * np.sin(az), np.sin(el)
    ex, ez = 2.0 / n, 2.0 / nz
    p = np.stack([np.sign(x) * np.abs(x) ** ex, np.sign(y) * np.abs(y) ** ex, np.sign(z) * np.abs(z) ** ez], axis=-1)
    return np.asarray(c, float) + p * np.asarray(r, float)


def ellipsoid_normal(r, az, el, n=2.0, nz=None):
    """Approximate outward normal of an axis aligned (super)ellipsoid at (az, el)."""
    az, el = np.radians(az), np.radians(el)
    nz = n if nz is None else nz
    x, y, z = np.cos(el) * np.cos(az), np.cos(el) * np.sin(az), np.sin(el)
    r = np.asarray(r, float)
    g = np.stack([np.sign(x) * np.abs(x) ** (2 - 2 / n + 1e-9) / r[0], np.sign(y) * np.abs(y) ** (2 - 2 / n + 1e-9) / r[1],
                  np.sign(z) * np.abs(z) ** (2 - 2 / nz + 1e-9) / r[2]], axis=-1)
    return g / (np.linalg.norm(g, axis=-1, keepdims=True) + 1e-12)


def surface_patch(c, r, az0, az1, el0, el1, off, inner=0.01, nu=18, nv=10, n=2.0, nz=None, name='patch', mat='M_Hair', **kw):
    """Blob stuck to a (super)ellipsoid: azimuth/elevation window with an offset profile off(s,t) in [0,1]^2 -> metres
    (zero at the edges blends it into the surface). A thin inner layer closes the solid."""
    az = np.linspace(az0, az1, nu)
    el = np.linspace(el0, el1, nv)
    AZ, EL = np.meshgrid(az, el)
    S, T = np.meshgrid(np.linspace(0, 1, nu), np.linspace(0, 1, nv))
    P = ellipsoid_point(c, r, AZ, EL, n, nz)
    Nn = ellipsoid_normal(r, AZ, EL, n, nz)
    o = np.asarray(off(S, T), float)[..., None]
    return grid_solid(P + Nn * o, P - Nn * inner, False, name, mat, **kw)


def poly_prism(name, poly, depth, bevel=0.0, mat='M_Emblem', bevel_segs=2, **kw):
    """Extrude a (possibly concave) 2D polygon [(x,y)...] along +Z from 0..depth, optional bevel, via bmesh."""
    import bmesh
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in poly]
    f = bm.faces.new(vs)
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    vv = [e for e in ex['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, depth), verts=vv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=bevel_segs, profile=0.6, affect='EDGES')
    V = np.array([v.co[:] for v in bm.verts])
    ix = {v: i for i, v in enumerate(bm.verts)}
    F = [tuple(ix[v] for v in fc.verts) for fc in bm.faces]
    bm.free()
    return Part(name, V, F, mat, **kw)


def rounded_box(name, size, bevel, c=(0, 0, 0), mat='M_Skin', segs=3, **kw):
    """Box with rounded edges via bmesh bevel. size = full extents."""
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segs, profile=0.7, affect='EDGES')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    V = np.array([v.co[:] for v in bm.verts]) + np.asarray(c, float)
    ix = {v: i for i, v in enumerate(bm.verts)}
    F = [tuple(ix[v] for v in fc.verts) for fc in bm.faces]
    bm.free()
    return Part(name, V, F, mat, **kw)


# ----------------------------------------------------------------------------- skin weight helpers
def chain_weights(joints, width=0.08):
    """Weight function for a limb tube split at joints. joints = [(bone, start_point), ...] ordered along the limb, each
    start_point is where that bone begins. Vertices are blended between neighbouring bones within +-width/2 of the plane
    through each joint (plane normal = direction from the previous joint to this one)."""
    pts = [np.asarray(p, float) for _, p in joints]
    names = [b for b, _ in joints]

    def fn(V):
        V = np.asarray(V, float)
        K = len(joints)
        T = [None] + []
        t = [np.ones(len(V))]
        for k in range(1, K):
            d = pts[k] - pts[k - 1]
            d = d / (np.linalg.norm(d) + 1e-12)
            t.append(smoothstep(-width / 2, width / 2, (V - pts[k]) @ d))
        W = []
        for k in range(K):
            w = t[k] * (1 - t[k + 1]) if k + 1 < K else t[k]
            W.append(w)
        tot = np.sum(W, axis=0) + 1e-9
        return {names[k]: W[k] / tot for k in range(K) if (W[k] / tot).max() > 1e-4}
    return fn


# ----------------------------------------------------------------------------- assembly into a Blender mesh
def assemble(parts, mesh_name, mat_order, bones=None, sharp_default=None, with_col=True):
    """Create ONE Blender mesh object from parts. mat_order = list of material names (slot order, materials created later).
    Returns (obj, weight_matrix(n x nbones) or None). Faces are smooth; edges sharper than part.sharp are split."""
    import bpy
    import bmesh
    from mathutils import Vector
    me = bpy.data.meshes.new(mesh_name)
    bm = bmesh.new()
    cols = []
    allw = []
    bones = list(bones or [])
    bidx = {b: i for i, b in enumerate(bones)}
    for p in parts:
        vs = [bm.verts.new(Vector(v)) for v in p.V]
        faces = []
        for f in p.F:
            try:
                fc = bm.faces.new([vs[i] for i in f])
            except ValueError:
                continue
            fc.material_index = mat_order.index(p.mat)
            fc.smooth = True
            faces.append(fc)
        bm.faces.ensure_lookup_table()
        if p.recalc:
            bmesh.ops.recalc_face_normals(bm, faces=faces)
        if p.sharp is not None:
            lim = math.radians(p.sharp)
            es = set(e for fc in faces for e in fc.edges)
            for e in es:
                if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > lim:
                    e.smooth = False
        cols.extend([p.col] * len(vs))
        if bones:
            W = np.zeros((len(vs), len(bones)))
            w = p.weights(p.V) if callable(p.weights) else p.weights
            if w is not None:
                for b, arr in w.items():
                    W[:, bidx[b]] = arr
            elif p.bone is not None:
                W[:, bidx[p.bone]] = 1.0
            allw.append(W)
    bm.verts.ensure_lookup_table()
    # the vert order is creation order, so colours/weights line up
    bm.to_mesh(me)
    bm.free()
    for m in mat_order:
        me.materials.append(None)
    if with_col:
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        arr = np.array([[c[0], c[1], c[2], 1.0] for c in cols], np.float32)
        ca.data.foreach_set('color', arr.ravel())
    obj = bpy.data.objects.new(mesh_name, me)
    bpy.context.scene.collection.objects.link(obj)
    W = np.concatenate(allw) if allw else None
    if W is not None:
        for b, i in bidx.items():
            vg = obj.vertex_groups.new(name=b)
            nz = np.nonzero(W[:, i] > 1e-4)[0]
            for k in nz:
                vg.add([int(k)], float(W[k, i]), 'REPLACE')
    return obj, W


def surf_path(c, r, azel, off=0.0, n=2.0, nz=None):
    """Points on a (super)ellipsoid for a list of (az, el[, off]) tuples, pushed `off` along the normal."""
    out = []
    for t in azel:
        az, el = t[0], t[1]
        o = t[2] if len(t) > 2 else off
        out.append(ellipsoid_point(c, r, az, el, n, nz) + ellipsoid_normal(r, az, el, n, nz) * o)
    return np.array(out)


def grid_surface(P, wrap_u=False, flip=False, name='surf', mat='M_Skin', **kw):
    """Open one-sided surface from a grid (nv, nu, 3); flip=False gives normals pointing along du x dv... see assemble(recalc=False)."""
    P = np.asarray(P, float)
    nv, nu = P.shape[:2]
    ul = nu if wrap_u else nu - 1
    F = []
    for j in range(nv - 1):
        for i in range(ul):
            i2 = (i + 1) % nu
            q = (j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i)
            F.append(q[::-1] if flip else q)
    p = Part(name, P.reshape(-1, 3), F, mat, **kw)
    p.recalc = False
    return p


def lip_shell(A, nin=3, thick=0.03, normals=None, wrap_u=True, name='dome', mat='M_Cloth_Primary', **kw):
    """Cap-like shell from outer grid A (nv, nu, 3) with outward normals: outer surface everywhere, plus an inner layer only for the
    first `nin` rows (the rim) so the lip has thickness. Triangle-cheap (no hidden inner dome)."""
    A = np.asarray(A, float)
    nv, nu = A.shape[:2]
    B = A - normals * thick
    V = np.concatenate([A.reshape(-1, 3), B[:nin].reshape(-1, 3)])
    off = nv * nu
    ul = nu if wrap_u else nu - 1
    F = []
    for j in range(nv - 1):
        for i in range(ul):
            i2 = (i + 1) % nu
            F.append((j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i))          # outward (az increasing = CCW from above)
    for j in range(nin - 1):
        for i in range(ul):
            i2 = (i + 1) % nu
            F.append((off + j * nu + i, off + (j + 1) * nu + i, off + (j + 1) * nu + i2, off + j * nu + i2))   # inward facing
    for i in range(ul):
        i2 = (i + 1) % nu
        F.append((i, off + i, off + i2, i2))                                                   # rim, faces down/out
    p = Part(name, V, F, mat, **kw)
    p.recalc = False
    return p

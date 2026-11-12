"""Tileable micro-detail generators (numpy only; run inside Blender's bundled python).

Every generator returns a dict of float32 (S, S) arrays in the *image* convention used by lib/bake.py (row 0 = v 0):
  H   height in [0,1] (becomes the tangent-space normal map)
  A   albedo modulation (sRGB, ~0.8..1.0, neutral grey) - the real colour lives in the glTF baseColorFactor
  R   roughness multiplier (~1)
"""
import numpy as np


def _q(f):
    return f * f * f * (f * (f * 6 - 15) + 10)


def vnoise(S, cx, cy, seed):
    """Tileable value noise in [0,1], cx x cy cells over the image."""
    rng = np.random.default_rng(seed)
    g = rng.random((cy, cx)).astype(np.float32)
    y = np.arange(S) / S * cy
    x = np.arange(S) / S * cx
    y0 = np.floor(y).astype(int); x0 = np.floor(x).astype(int)
    fy = _q((y - y0).astype(np.float32))[:, None]; fx = _q((x - x0).astype(np.float32))[None, :]
    y0m, y1m, x0m, x1m = y0 % cy, (y0 + 1) % cy, x0 % cx, (x0 + 1) % cx
    a = g[np.ix_(y0m, x0m)]; b = g[np.ix_(y0m, x1m)]; c = g[np.ix_(y1m, x0m)]; d = g[np.ix_(y1m, x1m)]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(S, cells, octaves=4, seed=0, gain=0.5, aniso=(1, 1)):
    out = np.zeros((S, S), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cx = max(1, int(cells * aniso[0] * 2 ** o)); cy = max(1, int(cells * aniso[1] * 2 ** o))
        out += amp * vnoise(S, cx, cy, seed + 17 * o)
        tot += amp
        amp *= gain
    return out / tot


def _prof(f, p=0.7):
    return np.clip(np.sin(np.pi * np.clip(f, 0, 1)), 0, None) ** p


def weave(S, pitch=7, seed=1, fuzz=0.12, twill=False):
    """Plain weave (or twill) height field with per-thread tone variation."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    u, v = xx / pitch, yy / pitch
    iu, iv = np.floor(u), np.floor(v)
    fu, fv = u - iu, v - iv
    if twill:
        over = ((iu + iv) % 4) < 2
    else:
        over = ((iu + iv) % 2) == 0
    warp = _prof(fv) * (0.55 + 0.45 * _prof(fu, 0.5))
    weft = _prof(fu) * (0.55 + 0.45 * _prof(fv, 0.5))
    H = np.where(over, warp, weft)
    n_th = vnoise(S, int(S / pitch), int(S / pitch), seed)   # per cell tone
    n_fz = fbm(S, S // 3, 2, seed + 5)
    H = H * 0.85 + fuzz * (n_fz - 0.5)
    n_lo = fbm(S, 5, 3, seed + 9)
    A = 0.88 + 0.07 * (n_th - 0.5) + 0.10 * (H - 0.5) + 0.10 * (n_lo - 0.5)
    R = 1.0 + 0.10 * (n_fz - 0.5) - 0.08 * (H - 0.5) + 0.15 * (n_lo - 0.5)
    return dict(H=H.astype(np.float32), A=A.astype(np.float32), R=R.astype(np.float32))


def knit(S, pitch=9, seed=2):
    """Soft knitted/cotton look: rows of V stitches."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    u, v = xx / pitch, yy / (pitch * 1.25)
    iv = np.floor(v); fv = v - iv
    fu = (u + 0.5 * (iv % 2)) % 1.0
    left = _prof(np.clip(fu * 2, 0, 1)) * (fu < 0.5)
    right = _prof(np.clip(fu * 2 - 1, 0, 1)) * (fu >= 0.5)
    H = (left + right) * (0.6 + 0.4 * np.sin(np.pi * fv)) * 0.9
    n = fbm(S, S // 4, 2, seed)
    H = H + 0.1 * (n - 0.5)
    A = 0.9 + 0.12 * (H - 0.5) + 0.05 * (n - 0.5)
    return dict(H=H.astype(np.float32), A=A.astype(np.float32), R=(1.0 - 0.05 * (H - 0.5)).astype(np.float32))


def skin(S, seed=3):
    """Fine pores + soft blotches."""
    pores = fbm(S, S // 3, 2, seed, 0.6)
    blot = fbm(S, 6, 3, seed + 3)
    H = 0.55 * pores + 0.45 * blot
    A = 0.95 + 0.08 * (blot - 0.5) - 0.05 * (pores - 0.5)
    R = 1.0 + 0.25 * (pores - 0.5) + 0.15 * (blot - 0.5)
    return dict(H=H.astype(np.float32), A=A.astype(np.float32), R=R.astype(np.float32))


def grain(S, seed=4, scale=40, contrast=1.0):
    """Leather / rubber / plastic grain: rounded pebbles."""
    n1 = fbm(S, scale, 3, seed, 0.55)
    n2 = fbm(S, scale // 3, 2, seed + 9)
    c = np.abs(n1 - 0.5) * 2
    H = (1 - c ** 1.5) * 0.7 + 0.3 * n2
    A = 0.92 + 0.10 * (n2 - 0.5) + 0.05 * (H - 0.5) * contrast
    R = 1.0 + 0.2 * (n1 - 0.5)
    return dict(H=H.astype(np.float32), A=A.astype(np.float32), R=R.astype(np.float32))


def hair(S, seed=5, strands=140):
    """Anisotropic strand ridges (long in v)."""
    a = fbm(S, 2, 2, seed, 0.5, aniso=(strands // 2, 1))
    b = fbm(S, 3, 2, seed + 7, 0.5, aniso=(strands // 6, 1))
    H = 0.65 * a + 0.35 * b
    A = 0.82 + 0.25 * (H - 0.5)
    R = 1.0 + 0.2 * (a - 0.5)
    return dict(H=H.astype(np.float32), A=A.astype(np.float32), R=R.astype(np.float32))


def smooth(S, seed=6, amp=0.03):
    n = fbm(S, 8, 3, seed)
    return dict(H=(0.5 + amp * (n - 0.5)).astype(np.float32), A=(0.97 + 0.04 * (n - 0.5)).astype(np.float32),
                R=(1.0 + 0.1 * (n - 0.5)).astype(np.float32))


def metal(S, seed=7):
    n = fbm(S, 30, 3, seed)
    return dict(H=(0.5 + 0.02 * (n - 0.5)).astype(np.float32), A=(0.97 + 0.05 * (n - 0.5)).astype(np.float32),
                R=(1.0 + 0.45 * (n - 0.5)).astype(np.float32))


def shell(S, seed=8):
    """Glossy hard shell with faint hexagon-ish scutes."""
    n = fbm(S, 14, 3, seed)
    c = np.abs(n - 0.5) * 2
    H = 0.4 + 0.5 * np.clip(c * 1.6, 0, 1) ** 0.5
    A = 0.92 + 0.14 * (n - 0.5) + 0.06 * (H - 0.5)
    return dict(H=H.astype(np.float32), A=A.astype(np.float32), R=(0.9 + 0.2 * (n - 0.5)).astype(np.float32))


def fur(S, seed=9):
    n1 = fbm(S, S // 2, 2, seed, 0.6)
    n2 = fbm(S, 12, 3, seed + 3)
    H = 0.6 * n1 + 0.4 * n2
    return dict(H=H.astype(np.float32), A=(0.88 + 0.2 * (n1 - 0.5) + 0.08 * (n2 - 0.5)).astype(np.float32),
                R=(1.0 + 0.1 * (n1 - 0.5)).astype(np.float32))


KINDS = dict(weave=weave, twill=lambda S, **k: weave(S, twill=True, **k), knit=knit, skin=skin, grain=grain, hair=hair,
             smooth=smooth, metal=metal, shell=shell, fur=fur)


def make(kind, S, **params):
    return KINDS[kind](S, **params)


def height_to_normal(H, strength):
    """Tangent space normal map (OpenGL / glTF: +Y up in image). strength may be an array. Returns float (S,S,3) in 0..1."""
    dx = (np.roll(H, -1, 1) - np.roll(H, 1, 1)) * 0.5
    dy = (np.roll(H, -1, 0) - np.roll(H, 1, 0)) * 0.5     # +v direction (image rows are bottom-up)
    s = np.asarray(strength, np.float32)
    nx, ny, nz = -dx * s, -dy * s, np.ones_like(H)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / ln, ny / ln, nz / ln], axis=-1) * 0.5 + 0.5


# ----------------------------------------------------------------------------- photoreal additions (round 3)
def voronoi(S, cells, seed=0, jitter=0.9):
    """Jittered-grid Voronoi on a tileable S x S image: returns d1, d2 (in cell units) and the cell id."""
    rng = np.random.default_rng(seed)
    pts = rng.random((cells, cells, 2)) * jitter + (1 - jitter) / 2
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    u, v = xx / S * cells, yy / S * cells
    iu, iv = np.floor(u).astype(int), np.floor(v).astype(int)
    d1 = np.full((S, S), 9.0, np.float32); d2 = np.full((S, S), 9.0, np.float32); cid = np.zeros((S, S), np.int64)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            cx, cy = iu + dx, iv + dy
            p = pts[cy % cells, cx % cells]
            d = np.sqrt((cx + p[..., 0] - u) ** 2 + (cy + p[..., 1] - v) ** 2)
            closer = d < d1
            d2 = np.where(closer, d1, np.minimum(d2, d))
            cid = np.where(closer, (cy % cells) * cells + (cx % cells), cid)
            d1 = np.where(closer, d, d1)
    return d1, d2, cid


def keratin(S, seed=10, cells=7, rings=9.0):
    """Turtle-shell scutes: grooves between plates, concentric growth rings inside each plate, scratches and wear."""
    d1, d2, cid = voronoi(S, cells, seed, 0.75)
    edge = np.clip((d2 - d1) / 0.12, 0, 1)
    ring = 0.5 + 0.5 * np.sin(d1 * rings * 2 * np.pi)
    n = fbm(S, 40, 3, seed + 1)
    scr = fbm(S, 3, 2, seed + 2, aniso=(90, 1))
    H = 0.55 * edge ** 0.5 + 0.12 * ring * edge + 0.1 * n + 0.08 * scr
    tone = vnoise(S, cells, cells, seed + 4)
    A = 0.80 + 0.10 * ring * edge + 0.10 * (tone - 0.5) + 0.06 * (n - 0.5) + 0.04 * np.clip(scr - 0.6, 0, 1) - 0.10 * (1 - edge) ** 3
    R = 0.85 + 0.35 * (1 - edge) + 0.25 * np.clip(scr - 0.55, 0, 1) + 0.15 * (n - 0.5)
    return dict(H=H.astype(np.float32), A=A.astype(np.float32), R=R.astype(np.float32))


def scales(S, seed=11, cells=70):
    """Reptile skin: rounded scales with darker interstitial skin."""
    d1, d2, cid = voronoi(S, cells, seed, 0.85)
    edge = np.clip((d2 - d1) / 0.25, 0, 1)
    dome = np.clip(1 - d1 * 1.6, 0, 1)
    tone = (cid * 0.6180339) % 1.0
    H = 0.6 * edge ** 0.6 + 0.4 * dome
    A = 0.80 + 0.12 * edge + 0.06 * (tone - 0.5)
    R = 1.15 - 0.3 * edge
    return dict(H=H.astype(np.float32), A=A.astype(np.float32), R=R.astype(np.float32))


def skin_real(S, seed=12):
    """Skin: pores, fine wrinkles, and RGB colour variation (redder blotches, slightly sallow areas)."""
    pores = fbm(S, S // 2, 2, seed, 0.6)
    wr = fbm(S, 6, 2, seed + 4, aniso=(40, 3))
    blot = fbm(S, 10, 4, seed + 3)
    H = 0.6 * pores + 0.25 * wr + 0.15 * blot
    b = blot - 0.5
    A3 = np.stack([1.0 + 0.02 * b, 0.97 - 0.10 * b, 0.96 - 0.12 * b], -1) * (0.97 - 0.05 * (pores[..., None] - 0.5))
    R = 1.0 + 0.30 * (pores - 0.5) + 0.25 * (blot - 0.5)
    return dict(H=H.astype(np.float32), A=A3.mean(-1).astype(np.float32), A3=A3.astype(np.float32), R=R.astype(np.float32))


def fungal(S, seed=13):
    """Leathery fungal hide: blotches, fine pitting, a few cracks."""
    d1, d2, _ = voronoi(S, 18, seed, 0.9)
    crack = np.clip((d2 - d1) / 0.05, 0, 1)
    pit = fbm(S, S // 4, 2, seed + 1)
    blot = fbm(S, 8, 4, seed + 2)
    H = 0.45 * crack + 0.35 * pit + 0.2 * blot
    A3 = np.stack([np.ones_like(blot), 0.96 - 0.06 * (blot - 0.5), 0.92 - 0.12 * (blot - 0.5)], -1) * (0.85 + 0.15 * crack[..., None]) * (0.95 + 0.1 * (pit[..., None] - 0.5))
    R = 0.9 + 0.3 * (pit - 0.5) + 0.2 * (1 - crack)
    return dict(H=H.astype(np.float32), A=A3.mean(-1).astype(np.float32), A3=A3.astype(np.float32), R=R.astype(np.float32))


def worn_gold(S, seed=14):
    """Struck gold: micro scratches (anisotropic), dents, dirt in low areas."""
    scr = fbm(S, 4, 2, seed, aniso=(120, 1))
    scr2 = fbm(S, 4, 2, seed + 5, aniso=(1, 120))
    dent = fbm(S, 12, 3, seed + 2)
    H = 0.5 + 0.15 * (scr - 0.5) + 0.15 * (scr2 - 0.5) + 0.3 * (dent - 0.5)
    A = 0.92 + 0.08 * (dent - 0.5) - 0.06 * np.clip(0.4 - dent, 0, 1)
    R = 0.8 + 0.6 * np.abs(scr - 0.5) + 0.6 * np.abs(scr2 - 0.5) + 0.4 * np.clip(0.4 - dent, 0, 1)
    return dict(H=H.astype(np.float32), A=A.astype(np.float32), R=R.astype(np.float32))


KINDS.update(keratin=keratin, scales=scales, skin_real=skin_real, fungal=fungal, worn_gold=worn_gold,
             hair_fine=lambda S, seed=5: hair(S, seed, strands=520))

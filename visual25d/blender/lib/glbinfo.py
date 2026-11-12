"""Print triangles / nodes / animations / textures of glb files (plain python)."""
import json, struct, sys
for f in sys.argv[1:]:
    d = open(f, 'rb').read(); L = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + L])
    tris = sum(j['accessors'][p['indices']]['count'] // 3 for m in j['meshes'] for p in m['primitives'])
    anims = {a['name']: round(max(j['accessors'][s['input']]['max'][0] for s in a['samplers']), 3) for a in j.get('animations', [])}
    imgs = sorted({i.get('name') for i in j.get('images', [])})
    mats = [m['name'] for m in j['materials']]
    print(f.split('/')[-1], 'tris', tris, 'size', len(d), 'meshes', [m['name'] for m in j['meshes']], 'anims', anims, 'mats', mats, 'morph', [m.get('extras') for m in j['meshes'] if m.get('extras')])

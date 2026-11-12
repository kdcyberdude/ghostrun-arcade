# Fetch the original CC0 scanned materials and physical-size metadata used by character builders.
import json, urllib.request, os
from pathlib import Path
output = Path(__file__).resolve().parents[2] / ".cache3d/polyhaven"
output.mkdir(parents=True, exist_ok=True)
os.chdir(output)
UA = {'User-Agent': 'ghostrun-3d-asset-build/1.0 (CC0 texture fetch)'}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA))
ids = ['denim_fabric','stretch_poplin','cotton_jersey','brown_leather','velour_velvet','metal_plate','rusty_metal_02','fabric_leather_02','rough_linen']
meta = {}
for i in ids:
    info = json.load(get(f'https://api.polyhaven.com/info/{i}'))
    files = json.load(get(f'https://api.polyhaven.com/files/{i}'))
    os.makedirs(i, exist_ok=True)
    got = {}
    for key in ('Diffuse', 'nor_gl', 'Rough'):
        if key not in files: continue
        ent = files[key]['1k'].get('png') or files[key]['1k'].get('jpg')
        dst = os.path.join(i, key + os.path.splitext(ent['url'])[1])
        open(dst, 'wb').write(get(ent['url']).read()); got[key] = dst
    meta[i] = dict(name=info.get('name'), dims_mm=info.get('dimensions'), authors=list(info.get('authors', {}).keys()), files=got, url=f'https://polyhaven.com/a/{i}')
    print(i, meta[i]['dims_mm'], list(got), meta[i]['authors'])
json.dump(meta, open('meta.json', 'w'), indent=1)

assert len(meta) == len(ids)
assert all(row["dims_mm"][0] > 0 and row["dims_mm"][1] > 0 and all(Path(p).stat().st_size for p in row["files"].values()) for row in meta.values())

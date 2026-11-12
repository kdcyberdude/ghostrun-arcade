#!/usr/bin/env python3
"""Fetch the CC0 Poly Haven assets used by the photoreal 2.5D presentation into assets25d/ph/ (gitignored, served at /assets25d/ph/).
Writes visual25d/polyhaven-manifest.json (id, type, resolution, URLs, licence) for the asset/licence manifest.
Usage: .cache25d/venv-tools/bin/python visual25d/tools/polyhaven.py      (idempotent: existing files are kept)"""
import json, os, urllib.request
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
UA = {'User-Agent': 'mario25d-asset-script (private, non-commercial experiment)'}
OUT = 'assets25d/ph'; MANIFEST = 'visual25d/polyhaven-manifest.json'
HDRIS = {'alps_field': 'ground', 'snowy_hillside': 'snow', 'narrow_moonlit_road': 'night', 'kloofendal_48d_partly_cloudy_puresky': 'sky'}
TEXTURES = ['excavated_soil_wall', 'leafy_grass', 'grass_path_2', 'sparse_grass', 'castle_brick_02_red', 'metal_plate', 'rusty_metal_02', 'castle_wall_varriation', 'castle_brick_01',
            'dark_rock_02', 'green_metal_rust', 'brown_planks_05', 'coast_sand_rocks_02', 'bark_brown_02', 'forest_ground_04', 'aerial_grass_rock', 'snow_02', 'snow_field_aerial']
MODELS = ['island_tree_01', 'island_tree_02', 'jacaranda_tree', 'tree_small_02', 'shrub_01', 'shrub_02', 'shrub_04', 'grass_medium_01', 'grass_medium_02', 'fern_02', 'rock_moss_set_01', 'boulder_01', 'flower_gazania', 'flower_ursinia', 'flower_empodium', 'periwinkle_plant', 'shrub_sorrel_01']

def api(path): return json.load(urllib.request.urlopen(urllib.request.Request('https://api.polyhaven.com/' + path, headers=UA)))
def fetch(url, dst):
    if os.path.exists(dst): return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r, open(dst + '.part', 'wb') as f: f.write(r.read())
    os.replace(dst + '.part', dst)

manifest = []
for hid, theme in HDRIS.items():
    f = api('files/' + hid); hdr = f['hdri']['2k']['hdr']['url']; fetch(hdr, f'{OUT}/hdri/{hid}_2k.hdr')
    bg = f'{OUT}/hdri/{hid}_bg.jpg'
    if not os.path.exists(bg):  # display panorama: tonemapped original downscaled to 8k equirect
        raw = f'.cache25d/ph-raw/{hid}_tonemapped.jpg'; fetch(f['tonemapped']['url'], raw)
        Image.open(raw).convert('RGB').resize((8192, 4096), Image.LANCZOS).save(bg, quality=88)
    manifest.append({'id': hid, 'type': 'hdri', 'theme': theme, 'files': [hdr, f['tonemapped']['url'] + ' (downscaled to 8192x4096)'], 'licence': 'CC0', 'page': 'https://polyhaven.com/a/' + hid})
for tid in TEXTURES:
    f = api('files/' + tid); urls = []
    for key, name in (('Diffuse', 'diff'), ('nor_gl', 'nor'), ('arm', 'arm')):
        u = f[key]['1k']['jpg']['url']; fetch(u, f'{OUT}/tex/{tid}_{name}.jpg'); urls.append(u)
    manifest.append({'id': tid, 'type': 'texture', 'resolution': '1k', 'files': urls, 'licence': 'CC0', 'page': 'https://polyhaven.com/a/' + tid})
for mid in MODELS:
    f = api('files/' + mid); g = f['gltf']['1k']['gltf']; fetch(g['url'], f'{OUT}/models/{mid}/{mid}.gltf'); urls = [g['url']]
    for rel, inc in g['include'].items(): fetch(inc['url'], f'{OUT}/models/{mid}/{rel}'); urls.append(inc['url'])
    manifest.append({'id': mid, 'type': 'model', 'resolution': '1k', 'files': urls, 'licence': 'CC0', 'page': 'https://polyhaven.com/a/' + mid})
json.dump({'source': 'Poly Haven (https://polyhaven.com), all assets CC0 1.0', 'assets': manifest}, open(MANIFEST, 'w'), indent=1)
print('assets:', len(manifest))

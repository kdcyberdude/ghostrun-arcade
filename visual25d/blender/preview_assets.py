"""Preview enemies/items. Usage: run.sh preview_assets.py -- enemies|items"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import preview
PV = os.path.join(HERE, 'previews')
what = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['enemies']
def sheet(name, glb, jobs, cols, size=(300, 340)):
    paths = preview.render_views(os.path.join(HERE, 'out', glb + '.glb'), jobs, os.path.join(PV, '_tmp_' + name), size=size, samples=32)
    return paths
def J(n, **k): return dict(name=n, label=n, **k)
if 'enemies' in what:
    p = sheet('goomba', 'goomba', [J(f'goomba_walk{k}', clip='walk', t=k/4, az=a, el=8) for k, a in ((0, 25), (1, 25), (2, 25), (3, 70))] + [J('goomba_front', clip='idle', t=0, az=90)], 5)
    p += sheet('koopa', 'koopa', [J(f'koopa_walk{k}', clip='walk', t=k/4, az=25) for k in range(4)] + [J('koopa_front', clip='idle', t=0.3, az=80)] + [J(f'koopa_fly{k}', clip='fly', t=k/3, az=30, hide=[]) for k in range(2)], 7)
    p += sheet('shell', 'koopa_shell', [J('shell_a', az=25), J('shell_b', az=100, el=25)], 2)
    preview.make_sheet(p, os.path.join(PV, 'enemies.png'), cols=6)
if 'items' in what:
    import json
    items = json.load(open(os.path.join(HERE, 'out', '_items.json')))
    p = []
    for name, clip in items.items():
        jobs = [J(f'{name}_a', az=25, clip=clip, t=0.0), J(f'{name}_b', az=70, clip=clip, t=0.25), J(f'{name}_c', az=25, clip=clip, t=0.5)]
        p += sheet(name, name, jobs, 3, (240, 260))
    preview.make_sheet(p, os.path.join(PV, 'items.png'), cols=6)
if 'round2' in what or 'npcs' in what:
    sets = dict(round2=[('piranha', 'idle'), ('beetle', 'walk'), ('beetle_shell', None), ('spiny', 'walk'), ('blooper', 'walk'), ('cheep', 'walk'),
                        ('bullet', 'idle'), ('lakitu', 'walk'), ('hammer_bro', 'walk'), ('hammer', 'spin'), ('podoboo', 'idle'), ('bowser', 'walk'),
                        ('bowser_flame', 'idle'), ('koopa', 'idle')],
                npcs=[('toad', 'idle'), ('princess', 'idle')])
    for key in ('round2', 'npcs'):
        if key not in what:
            continue
        p = []
        for name, clip in sets[key]:
            p += sheet(name, name, [J(f'{name}_a', az=25, clip=clip, t=0.0), J(f'{name}_b', az=75, clip=clip, t=0.5)], 2, (260, 300))
        preview.make_sheet(p, os.path.join(PV, f'{key}.png'), cols=6)

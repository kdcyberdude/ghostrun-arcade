"""Render previews of out/mario.glb. Usage: run.sh preview_mario.py [-- turn|poses|head|recolor|chibi|all] """
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import preview

GLB = os.path.join(HERE, 'out', 'mario.glb')
PV = os.path.join(HERE, 'previews')
TMP = os.path.join(PV, '_tmp')
what = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['turn']
if 'all' in what:
    what = ['turn', 'head', 'recolor', 'chibi', 'poses']

def run(name, jobs, cols, size=(360, 480), samples=40, **kw):
    paths = preview.render_views(GLB, jobs, TMP + '_' + name, size=size, samples=samples, **kw)
    preview.make_sheet(paths, os.path.join(PV, f'mario_{name}.png'), cols=cols)

if 'turn' in what:
    run('turntable', [dict(name=f'a{a:03d}', az=a, label=f'az {a}', el=6) for a in range(0, 360, 45)], 4)
if 'head' in what:
    run('head', [dict(name=f'h{a}', az=a, el=6, frame=((0.1, 0, 1.55), 0.95), label=f'head az {a}') for a in (0, 35, 70, 180, -35, 15)], 3, size=(420, 420))
if 'recolor' in what:
    luigi = {'M_Cloth_Primary': (0.05, 0.55, 0.12), 'M_Cloth_Secondary': (0.02, 0.05, 0.35)}
    fire = {'M_Cloth_Primary': (0.9, 0.9, 0.88), 'M_Cloth_Secondary': (0.75, 0.04, 0.04)}
    jobs = [dict(name='mario', az=30, label='Mario'), dict(name='luigi', az=30, recolor=luigi, label='Luigi'), dict(name='fire', az=30, recolor=fire, label='Fire')]
    run('recolor', jobs, 3)
if 'chibi' in what:
    run('chibi', [dict(name='big', az=30, label='big'), dict(name='chibi', az=30, shapes={'Chibi': 1}, label='chibi=1'),
                  dict(name='chibi_side', az=0, shapes={'Chibi': 1}, label='chibi side'), dict(name='half', az=30, shapes={'Chibi': 0.5}, label='chibi=.5')], 4)
if 'poses' in what:
    clips = ['idle', 'skid', 'jump', 'fall', 'duck', 'slide', 'death', 'throw']
    jobs = []
    for c in clips:
        t = 1.0 if c in ('skid', 'jump', 'fall', 'duck', 'slide', 'death') else (0.0 if c == 'idle' else 0.45)
        for az in (20, 70):
            jobs.append(dict(name=f'{c}_{az}', clip=c, t=t, az=az, label=f'{c} az{az}'))
    run('poses', jobs, 8, size=(260, 340), samples=24)
if 'loops' in what:
    for c in ('swim', 'climb', 'victory'):
        run('loop_' + c, [dict(name=f'{c}{k}', clip=c, t=k / 6, az=25, label=f'{c} {k}/6') for k in range(6)], 6, size=(260, 340), samples=24)
if 'gait' in what:
    run('walk', [dict(name=f'w{k}', clip='walk', t=k / 8, az=0, el=2, frame=((0, 0, 0.95), 2.2), label=f'walk {k}/8') for k in range(8)], 8, size=(300, 300), samples=24, ortho=True)
    run('run', [dict(name=f'r{k}', clip='run', t=k / 8, az=0, el=2, frame=((0, 0, 0.95), 2.2), label=f'run {k}/8') for k in range(8)], 8, size=(300, 300), samples=24, ortho=True)

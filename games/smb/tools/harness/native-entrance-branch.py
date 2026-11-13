"""Capture controller-only native branches from an authenticated retained entrance.

Required: --lab --observer --rom-dir --boot-dir --recordings --archive --baseline
          --level --pads --prefix --out
Baseline/<level> contains the original initial.ram, pads.bin and ram.bin. Every
baseline RAM row is reproduced before the new pad stream is allowed to run.
No native RAM is edited; the emulator restores the original complete entrance.
Outputs out/{traces,entrances}/<level> for native-excerpt.ts/native-runs.test.ts.
"""
import argparse
import ctypes
import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np
import torch

p = argparse.ArgumentParser(description=__doc__)
for name in ['lab', 'observer', 'rom-dir', 'boot-dir', 'recordings', 'archive', 'baseline', 'pads', 'out']:
    p.add_argument('--' + name, type=Path, required=True)
p.add_argument('--level', required=True)
p.add_argument('--prefix', type=int, required=True)
a = p.parse_args()
os.environ['RL_ROM_DIR'] = str(a.rom_dir)
os.environ['RL_BOOT_DIR'] = str(a.boot_dir)
torch.set_num_threads(1)
sys.path[:0] = [str(a.lab / 'rl'), str(a.lab / 'scripts/recording')]
import rlenv
from record_v2 import load_entrances, archive_unit

rlenv.build_cpu = lambda: a.observer
a.out.mkdir(parents=True, exist_ok=True)
arc, slots, arc_sha = load_entrances(a.archive, a.out)
log = json.loads((a.recordings / 'v2' / a.level / f'smb_v2_{a.level}.actions.json').read_text())
receipt = json.loads((a.recordings / 'threejs-2d' / a.level / 'entrance.json').read_text())
level_index = (int(a.level[0]) - 1) * 4 + int(a.level[2]) - 1
base = a.baseline / a.level
original_pads = (base / 'pads.bin').read_bytes()
original_ram = (base / 'ram.bin').read_bytes()
pads = a.pads.read_bytes()
if not 0 <= a.prefix <= min(len(pads), len(original_pads)) or pads[:a.prefix] != original_pads[:a.prefix]:
    raise ValueError('Declared common controller prefix differs')
if len(original_ram) != len(original_pads) * 2048:
    raise ValueError('Incomplete native baseline')
P = ctypes.c_void_p
ram = np.empty(2048, dtype=np.uint8)
sha = lambda b: hashlib.sha256(b).hexdigest()


def read(env):
    env.lib.ghostrun_read_ram(env.h, P(ram.ctypes.data))
    return ram.tobytes()


def setup():
    env = rlenv.RlEnv({'smb': 1}, device='cpu', seed=log['selection']['seed'], sticky=False,
                      idle_max=0, dropout=False, level_cap=slots)
    env.lib.ghostrun_read_ram.argtypes = [P, P]
    env.lib.ghostrun_frame.argtypes = [P, ctypes.c_ubyte]
    env.start()
    if level_index:
        state = env.state_dict()
        if log['start_state']['archive_sha256'] != arc_sha or sum(u * slots for u in archive_unit(env)) != len(arc):
            raise ValueError('Native entrance archive does not match the original recording')
        state['env'][-len(arc):] = arc
        env.load_state_dict(state)
        weights = np.zeros(slots)
        weights[level_index] = 1
        env.set_level_plan(0, 1.0, weights)
        env.start()
        env.actions.zero_()
        warm = 0
        for _ in range(300):
            env.step()
            warm += len(env.pads[0])
            if int(env.level_now[0]) == level_index:
                break
    else:
        warm = len(rlenv.boot_pads('smb')) + 4
    initial = read(env)
    if initial != (base / 'initial.ram').read_bytes() or sha(initial) != receipt['initialRamSha256'] or warm != receipt['sourceFrameOffset']:
        raise ValueError('Restored native entrance differs')
    return env, initial


# Verify the complete original input before running any changed decisions.
env, initial = setup()
for frame, pad in enumerate(original_pads):
    if env.lib.ghostrun_frame(env.h, pad) != 0 or read(env) != original_ram[frame * 2048:(frame + 1) * 2048]:
        raise ValueError(f'Original native baseline differs at frame {frame}')
del env
env, initial = setup()
rows = bytearray()
for frame, pad in enumerate(pads):
    if env.lib.ghostrun_frame(env.h, pad) != 0:
        raise RuntimeError(f'Native frame failed at {frame}')
    row = read(env)
    if frame < a.prefix and row != original_ram[frame * 2048:(frame + 1) * 2048]:
        raise ValueError(f'Native common RAM prefix differs at frame {frame}')
    rows.extend(row)

source = {'schema': 'native-entrance-controller-branch-v1', 'level': a.level,
          'archiveSha256': arc_sha, 'archiveFileSha256': sha(a.archive.read_bytes()),
          'backendSha256': sha(a.observer.read_bytes()), 'baselinePadsSha256': sha(original_pads),
          'originalActionsSha256': receipt['actionsSha256'],
          'initialRamSha256': sha(initial), 'baselineFrames': len(original_pads),
          'baselineRamSha256': sha(original_ram), 'commonPrefixFrames': a.prefix,
          'commonPrefixRamSha256': sha(rows[:a.prefix * 2048]),
          'padsSha256': sha(pads), 'ramSha256': sha(rows),
          'method': 'Complete original native v2 baseline and unchanged common RAM prefix verified byte-for-byte; restored full archived entrance, controller-only changed decisions, no RAM writes or mid-run corrections.'}
trace = a.out / 'traces' / a.level
entrance = a.out / 'entrances' / a.level
trace.mkdir(parents=True, exist_ok=True)
entrance.mkdir(parents=True, exist_ok=True)
for name, data in [('initial.ram', initial), ('pads.bin', pads), ('ram.bin', rows)]:
    (trace / name).write_bytes(data)
(trace / 'branch.json').write_text(json.dumps(source, indent=2) + '\n')
receipt.update(actionsSha256=sha(pads), sourceBranch=source)
(entrance / 'entrance.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(source), flush=True)

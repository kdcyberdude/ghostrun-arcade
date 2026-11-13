"""Prospective, all-hypothesis camera chain; target pixels never register themselves."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--trace', default='evidence/local/reference-campaign-dense/trace.jsonl')
parser.add_argument('--extension')
parser.add_argument('--start', type=int, default=5936)
parser.add_argument('--end', type=int, default=5976)
parser.add_argument('--out', default='evidence/lower-row-chain-training.json')
parser.add_argument('--independent-mosaic')
parser.add_argument('--save-mosaic')
args = parser.parse_args()
WIDTH = 4096
known = np.zeros((240, WIDTH), dtype=bool)
rgb = np.zeros((240, WIDTH, 3), dtype='uint8')
source_tick = np.zeros((240, WIDTH), dtype='int32')
source_screen_x = np.zeros((240, WIDTH), dtype='int16')


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def records(path):
    return {r['response']['tick']: r for r in map(json.loads, Path(path).read_text().splitlines()) if r.get('response', {}).get('image')}


rows = records(ROOT / args.trace)
if args.extension:
    rows.update({t: r for t, r in records(ROOT / args.extension).items() if t > 5976})


def image(r):
    return np.asarray(Image.open(r.get('image') or r['response']['image']['capture_path']).convert('RGB'))


def foreground(im):
    mask = np.any(im != im[:, :, :1], axis=2)
    pad = np.pad(mask, 4)
    return np.logical_or.reduce([pad[y:y + 240, x:x + 256] for y in range(9) for x in range(9)])


def learn(im, fg, origins, tick):
    added = 0
    for y in range(48, 208):
        if len(origins[y]) != 1:
            continue
        cam = next(iter(origins[y]))
        valid = ~fg[y]
        first = ~known[y, cam:cam + 256] & valid
        assert np.all(~known[y, cam:cam + 256][valid] | np.all(rgb[y, cam:cam + 256][valid] == im[y][valid], axis=1))
        added += int(np.count_nonzero(first))
        source_tick[y, cam:cam + 256][first] = tick
        source_screen_x[y, cam:cam + 256][first] = np.arange(256)[first]
        rgb[y, cam:cam + 256][valid] = im[y][valid]
        known[y, cam:cam + 256][valid] = True
    return added


def fit(im, fg, previous, frames):
    bound = int(np.ceil(2.5 * frames))
    reachable = sorted({cam + dx for cam in previous for dx in range(bound + 1) if cam + dx + 256 < WIDTH})
    fits = {}
    for cam in reachable:
        valid = known[:, cam:cam + 256] & ~fg
        bad = (np.any(rgb[:, cam:cam + 256] != im, axis=2) & valid).ravel()
        indices = np.flatnonzero(bad)
        fits[cam] = [int(indices[0]) if len(indices) else 240 * 256, int(indices[-1]) if len(indices) else -1]
    hypotheses = []
    for latest in reachable:
        for old in range(max(0, latest - 3), latest + 1):
            parents = [p for p in previous if p <= old <= p + int(np.ceil(2.5 * max(0, frames - 1))) and latest <= p + bound]
            if old not in fits or not parents:
                continue
            lower, upper = fits[old][1] + 1, fits[latest][0]
            if lower > upper:
                continue
            anchors = []
            for row in range(3, 13):
                y = row * 16
                for col in range((latest + 15) // 16, (old + 256) // 16):
                    x = col * 16
                    patch = rgb[y:y + 16, x:x + 16]
                    if not np.all(known[y:y + 16, x:x + 16]) or not np.any(patch != patch[0, 0]):
                        continue
                    good = True
                    for yy in range(16):
                        wy = y + yy
                        cams = {latest} if (wy + 1) * 256 <= lower else {old} if wy * 256 >= upper else {latest, old}
                        for cam in cams:
                            sx = x - cam
                            if np.any(fg[wy, sx:sx + 16]) or not np.array_equal(im[wy, sx:sx + 16], patch[yy]):
                                good = False
                                break
                        if not good:
                            break
                    if good:
                        anchors.append([col, row])
            hypotheses.append({'latestCamera': latest, 'previousNativeCamera': old, 'tearRasterPixelRangeInclusive': [lower, upper], 'parentLatestCandidates': parents, 'wholeNonuniformEstablishedAnchors': anchors})
    origins = [set() for _ in range(240)]
    for h in hypotheses:
        lo, hi = h['tearRasterPixelRangeInclusive']
        for y in range(240):
            if y * 256 < hi:
                origins[y].add(h['latestCamera'])
            if (y + 1) * 256 - 1 >= lo:
                origins[y].add(h['previousNativeCamera'])
    return hypotheses, origins


first = image(rows[args.start])
if args.independent_mosaic:
    independent = np.load(ROOT / args.independent_mosaic)
    known[:] = independent['known']
    rgb[:] = independent['rgb']
    assert not np.any(known[208:]), 'Targets must never enter registration'
else:
    learn(first, foreground(first), [{0} for _ in range(240)], args.start)
previous = {0}
chain = []
failed = False
for tick in range(args.start + 1, args.end + 1):
    r = rows[tick]
    im = image(r)
    fg = foreground(im)
    frames = r['response']['frames_advanced']
    hypotheses, origins = fit(im, fg, previous, frames)
    if not hypotheses:
        chain.append({'tick': tick, 'failed': True, 'previousLatestCameraCandidates': sorted(previous), 'framesAdvanced': frames, 'reason': 'No exact RGB/native-bound hypothesis. No fallback.'})
        failed = True
        print('FAILED', tick, sorted(previous), flush=True)
        break
    previous = {h['latestCamera'] for h in hypotheses}
    qualified = all(len(h['wholeNonuniformEstablishedAnchors']) >= 8 for h in hypotheses)
    added = 0 if args.independent_mosaic else learn(im, fg, origins, tick)
    observation = {'tick': tick, 'framesAdvanced': frames, 'nativeFrame': r.get('nativeFrame'), 'latestCameraCandidates': sorted(previous), 'cameraCandidatesByPixelRow': [sorted(o) for o in origins], 'hypotheses': hypotheses, 'eightAnchorEndpoint': qualified, 'targetImageEvidenceEligible': qualified, 'newProvisionalUpperPixelsOnlyAtAllHypothesisUniqueOrigin': added, 'sourceImage': r.get('image') or r['response']['image']['capture_path']}
    chain.append(observation)
    print(tick, 'latest', sorted(previous), 'floor208', sorted(origins[208]), 'hypotheses', len(hypotheses), 'anchors', min(len(h['wholeNonuniformEstablishedAnchors']) for h in hypotheses), 'new', added, flush=True)
result = {'schema': 'lower-row-camera-chain-prospective-v1', 'status': 'training-diagnostic-no-map-export', 'rule': 'evidence/lower-row-camera-chain-rule.json', 'codeSha256': digest(__file__), 'sourceTraces': [{'path': args.trace, 'sha256': digest(ROOT / args.trace)}] + ([{'path': args.extension, 'sha256': digest(ROOT / args.extension)}] if args.extension else []), 'startTick': args.start, 'startCamera': 0, 'allTargetPixelsExcludedFromRegistration': True, 'chain': chain, 'passedThroughEnd': not failed and bool(chain) and chain[-1]['tick'] == args.end, 'independentMosaic': args.independent_mosaic, 'independentMosaicSha256': digest(ROOT / args.independent_mosaic) if args.independent_mosaic else None, 'qualifiedForAcceptance': False, 'reason': 'Requires independent fresh camera-zero heldout chain and backward closure. Diagnostic does not accept cells.'}
(ROOT / args.out).write_text(json.dumps(result, indent=2) + '\n')

if args.save_mosaic:
    np.savez_compressed(ROOT / args.save_mosaic, known=known, rgb=rgb, source_tick=source_tick, source_screen_x=source_screen_x)

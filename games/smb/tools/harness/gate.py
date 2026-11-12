#!/usr/bin/env python3
"""Fidelity gate: one command that answers "did my change make the game better or worse?" (stdlib only).

Runs, in order: tsc, npm test (summary + failing names), data/levels.json regeneration check, then the full 1-1..8-4 campaign comparison
against the native trace (default table and the per-kind NEAREST table, in parallel), and prints only what CHANGED against a stored
reference, plus a verdict. Replaces the ~10 manual commands that were run after every merge. Read-only apart from the reference dir.

  python3 tools/harness/gate.py                 # full gate against evidence/local/gate-ref
  python3 tools/harness/gate.py --quick         # skip tsc / npm test / levels check (campaign only, ~5 s)
  python3 tools/harness/gate.py --save-ref      # run, then store the results as the new reference (do this after an accepted change)
  python3 tools/harness/gate.py --json          # machine-readable result on stdout

FRAC0=1 is on for every campaign run (reference and current): the sub-pixel fraction carried across a level change / re-seed is zeroed, so a castle-exit length change no longer moves the next
level (GATE_FRAC0=0 turns it off; the reference must be regenerated after changing it). Native input capture phase (PHASES=1) differs from the replay convention from 1-4 on; those levels are
listed as phase-suspect, and a REGRESSION on a phase-suspect level is only BAD when the same level also rises under the corrected phase (LATENCY string, same seeds) - otherwise it is
reported as a note. The cause-class table (tools/harness/cause-classes.mjs) groups the over-8 px events of the 0.5 run by cause with one repro frame per class and level.
Per-level events/over8 are the mean over GATE_SEEDS (default 0.25,0.5,0.75 mid-air seed constants), so one lucky/unlucky re-seed does not make or hide a regression; kinds/ids/walker come from the 0.5 run.
Always the FULL range 1-1..8-4: a partial range starts the remake from the wrong state and gives invalid numbers.
Verdict rules (exit code 1 on FAIL or REGRESSION): tsc/test failure beyond the reference, stale levels.json, a level whose events over 8 px
rise by >= 3 or whose levelMismatch rises, a per-kind within-2px share (n >= 50; on a phase-suspect level only when the corrected phase does not clear it) or a per-object-id match share (n >= 100, IDCOV) that falls by >= 10 points. WARN (exit 0): events up by
>= max(10, 15%), overall walker share down >= 1 point. Known measuring artifacts are listed in .claude/skills/fidelity-gate-and-merge.
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TRACE = os.environ.get('GATE_TRACE', 'evidence/local/native-trace-winning-route-ram-20261109.jsonl')
REF = os.environ.get('GATE_REF', os.path.join(ROOT, 'evidence/local/gate-ref'))
LEVEL_RE = re.compile(r'^(\d-\d)\s+frames\s+(\d+) events\s+(\d+) \(>8px (\d+)\).*levelMismatch (\d+)')
KIND_RE = re.compile(r'^(\d-\d) (\w+)\s+n (\d+) within2px (\d+)%')
IDCOV_RE = re.compile(r'^IDCOV (\d-\d) id(\d+)\s+native-frames\s+(\d+) matched\s+(\d+)%')
WALKER_RE = re.compile(r'walker enemy-frames within 2px of the native enemy: (\d+) / (\d+) \(([\d.]+)%\)')


def sh(cmd, env=None, timeout=1200):
    p = subprocess.run(cmd, shell=True, cwd=ROOT, capture_output=True, text=True, timeout=timeout, env={**os.environ, **(env or {})})
    return p.returncode, p.stdout + p.stderr


SEEDS = [x for x in os.environ.get('GATE_SEEDS', '0.25,0.5,0.75').split(',') if x]  # mid-air seed vy+x (campaign-compare VYADJ): per-level numbers are chaotic in this constant


FRAC0 = os.environ.get('GATE_FRAC0', '1') != '0'  # campaign-compare reads any set FRAC0 as on, so the variable is only passed when on


def campaign(mode, vyadj='0.5', latency=None):
    cmd = f'npx tsx tools/campaign-compare.ts {TRACE} --from=1-1 --to=8-4 --threshold=3' + (' --events=0' if mode else ' --events=100000')
    env = {'VYADJ': vyadj, **({'FRAC0': '1'} if FRAC0 else {}), **({'NEAREST': '1', 'IDCOV': '1'} if mode else {}), **({'LATENCY': latency} if latency else {})}
    return sh(cmd, env)[1]


def phase_spec():
    """The native input capture phase per level (campaign-compare PHASES=1): 'lv:0@row' = jump on the press row (early), the replay default is the next row."""
    m = re.search(r'LATENCY=(\S*)', sh(f'npx tsx tools/campaign-compare.ts {TRACE} --from=1-1 --to=8-4 --threshold=3', {'PHASES': '1'})[1])
    return m[1] if m else ''


def cause_classes(text, *extra):
    tmp = tempfile.mktemp()
    open(tmp, 'w').write(text)
    try:
        return sh(f'node tools/harness/cause-classes.mjs {tmp} --trace={TRACE} ' + ' '.join(extra))[1]
    finally:
        os.remove(tmp)


def mean_levels(runs):
    """Per-level events/over8 averaged over the seed runs (a single re-seed landing either side of a 3 px threshold moves one level by +-15), mismatch = worst."""
    out = {}
    for lv in runs[0]['levels']:
        rs = [r['levels'][lv] for r in runs if lv in r['levels']]
        out[lv] = dict(events=round(sum(r['events'] for r in rs) / len(rs)), over8=round(sum(r['over8'] for r in rs) / len(rs)), mismatch=max(r['mismatch'] for r in rs))
    return out


def parse_campaign(text):
    levels, kinds, walker, ids = {}, {}, None, {}
    for line in text.splitlines():
        if m := IDCOV_RE.match(line):
            ids[f'{m[1]} id{m[2]}'] = dict(n=int(m[3]), pct=int(m[4]))
        elif m := LEVEL_RE.match(line):
            levels[m[1]] = dict(events=int(m[3]), over8=int(m[4]), mismatch=int(m[5]))
        elif m := KIND_RE.match(line):
            kinds[f'{m[1]} {m[2]}'] = dict(n=int(m[3]), pct=int(m[4]))
        elif m := WALKER_RE.search(line):
            walker = float(m[3])
    return dict(levels=levels, kinds=kinds, walker=walker, ids=ids)


def run_tests():
    rc, out = sh('npm test')
    nums = {k: int(v) for k, v in re.findall(r'^# (tests|pass|fail) (\d+)', out, re.M)}
    return dict(tests=nums.get('tests', 0), fail=nums.get('fail', 0), failing=sorted(set(re.findall(r'^not ok \d+ - (.*)$', out, re.M))))


def levels_reproducible():
    path = os.path.join(ROOT, 'data/levels.json')
    keep = tempfile.mktemp()
    shutil.copy(path, keep)
    rc, out = sh('node tools/compile-levels.mjs')
    same = rc == 0 and open(path, 'rb').read() == open(keep, 'rb').read()
    shutil.copy(keep, path)  # never leave a regenerated file behind: the gate is read-only
    os.remove(keep)
    return same


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quick', action='store_true')
    ap.add_argument('--save-ref', action='store_true')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    cur = {}
    spec = phase_spec()
    suspect = sorted({e.split(':')[0] for e in spec.split(',') if ':0@' in e})
    with ThreadPoolExecutor(1 + 2 * len(SEEDS)) as ex:
        fs = [ex.submit(campaign, False, v) for v in SEEDS]
        fl = [ex.submit(campaign, False, v, spec) for v in SEEDS] if suspect else []
        f2 = ex.submit(campaign, True)
        f3 = ex.submit(campaign, True, '0.5', spec) if suspect else None  # per-kind shares in the corrected phase (phase-suspect levels)
        if not a.quick:
            cur['tsc'] = sh('npx tsc --noEmit')[0] == 0
            cur['tests'] = run_tests()
            cur['levels_ok'] = levels_reproducible()
        seed_txts = [f.result() for f in fs]
        near_txt = f2.result()
    main_txt = seed_txts[SEEDS.index('0.5')] if '0.5' in SEEDS else seed_txts[0]
    c = parse_campaign(main_txt)
    c['levels'] = mean_levels([parse_campaign(t) for t in seed_txts])
    c['levels_lat'] = mean_levels([parse_campaign(f.result()) for f in fl]) if fl else {}
    c['suspect'] = suspect
    c['classes'] = json.loads(cause_classes(main_txt, '--json') or '{}').get('classes', {})
    pn = parse_campaign(near_txt)
    c['kinds'], c['walker'], c['ids'] = pn['kinds'], pn['walker'], pn['ids']
    lat3 = parse_campaign(f3.result()) if f3 else {}
    c['kinds_lat'], c['ids_lat'] = lat3.get('kinds', {}), lat3.get('ids', {})
    cur.update(c)
    ref = json.load(open(os.path.join(REF, 'summary.json'))) if os.path.exists(os.path.join(REF, 'summary.json')) else None
    notes, bad, warn = [], [], []
    if not a.quick:
        if not cur['tsc']:
            bad.append('tsc fails')
        if not cur['levels_ok']:
            bad.append('data/levels.json is not what tools/compile-levels.mjs produces (run it, commit the result)')
        known = set(ref['tests']['failing']) if ref and 'tests' in ref else set()
        new_fail = [n for n in cur['tests']['failing'] if n not in known]
        if new_fail:
            bad.append('new failing tests: ' + '; '.join(new_fail))
    if len(cur['levels']) < 32:
        bad.append(f'only {len(cur["levels"])}/32 levels in the campaign output (tool crashed?)')
    tot = lambda d, k: sum(v[k] for v in d['levels'].values())
    head = f"events {tot(cur, 'events')}  over8px {tot(cur, 'over8')}  walker-within-2px {cur['walker']}%"
    if not a.quick:
        head = f"tests {cur['tests']['tests'] - cur['tests']['fail']}/{cur['tests']['tests']}  " + head
    if ref:
        head += f"   (reference: events {tot(ref, 'events')} over8px {tot(ref, 'over8')} walker {ref['walker']}%)"
        for lv, v in cur['levels'].items():
            r = ref['levels'].get(lv)
            if not r or v == r:
                continue
            line = f"{lv}: events {r['events']}->{v['events']}  over8px {r['over8']}->{v['over8']}  mismatch {r['mismatch']}->{v['mismatch']}"
            lat, rlat = cur['levels_lat'].get(lv), ref.get('levels_lat', {}).get(lv)
            if v['over8'] - r['over8'] >= 3 or v['mismatch'] > r['mismatch']:
                if lv in suspect and lat and rlat and lat['over8'] - rlat['over8'] < 3 and lat['mismatch'] <= rlat['mismatch']:  # a levelMismatch flip that the corrected phase does not show is the knife-edge 1 px axe miss (5-1)
                    notes.append(f"phase-suspect, not confirmed in the corrected phase (over8px {rlat['over8']}->{lat['over8']}): " + line)
                else:
                    bad.append('REGRESSION ' + line)
            elif v['events'] - r['events'] >= max(10, 0.15 * r['events']):
                warn.append('events up ' + line)
            else:
                notes.append(line)
        for k, v in cur['kinds'].items():
            r = ref['kinds'].get(k)
            if r and v['n'] >= 50 and r['pct'] - v['pct'] >= 10:
                # same rule as the levels: on a phase-suspect level the drop is BAD unless the corrected phase (reference and current) shows it does not fall there
                rl, vl = ref.get('kinds_lat', {}).get(k), cur['kinds_lat'].get(k)
                if k.split()[0] in cur['suspect'] and rl and vl and rl['pct'] - vl['pct'] < 10:
                    notes.append(f"phase-suspect, not confirmed in the corrected phase ({rl['pct']}% -> {vl['pct']}%): enemy {k}: within-2px {r['pct']}% -> {v['pct']}%")
                else:
                    bad.append(f"REGRESSION enemy {k}: within-2px {r['pct']}% -> {v['pct']}%")
            elif r and v['n'] >= 50 and abs(v['pct'] - r['pct']) >= 10:
                notes.append(f"enemy {k}: within-2px {r['pct']}% -> {v['pct']}%")
        for k, v in cur['ids'].items():  # per native object id (IDCOV): any remake enemy within 20 px; platforms/firebars legitimately sit at 0%
            r = ref.get('ids', {}).get(k)
            if r and v['n'] >= 100 and r['pct'] - v['pct'] >= 10:
                # same phase-suspect rule as the per-kind rows: BAD unless the corrected phase (reference and current) shows the object does not fall there
                rl, vl = ref.get('ids_lat', {}).get(k), cur['ids_lat'].get(k)
                if k.split()[0] in cur['suspect'] and rl and vl and rl['pct'] - vl['pct'] < 10:
                    notes.append(f"phase-suspect, not confirmed in the corrected phase ({rl['pct']}% -> {vl['pct']}%): object {k}: matched {r['pct']}% -> {v['pct']}%")
                else:
                    bad.append(f"REGRESSION object {k}: matched {r['pct']}% -> {v['pct']}%")
            elif r and v['n'] >= 100 and v['pct'] - r['pct'] >= 10:
                notes.append(f"object {k}: matched {r['pct']}% -> {v['pct']}%")
        if ref.get('walker') and cur['walker'] is not None and ref['walker'] - cur['walker'] >= 1:
            warn.append(f"walker share {ref['walker']}% -> {cur['walker']}%")
    else:
        notes.append(f'no reference at {REF}: run with --save-ref after an accepted state')
    verdict = 'FAIL' if bad else ('WARN' if warn else 'PASS')
    if a.json:
        print(json.dumps(dict(verdict=verdict, bad=bad, warn=warn, notes=notes, current=cur)))
    else:
        print(head)
        for t, items in (('BAD', bad), ('WARN', warn), ('changed', notes)):
            for i in items:
                print(f'  [{t}] {i}')
        if suspect:
            print(f"  [phase-suspect] native input capture is one row earlier than the replay in {len(suspect)} levels ({' '.join(suspect)}); a flag there counts only if it also rises in the corrected phase")
        print(cause_classes(main_txt, f'--ref={os.path.join(REF, "summary.json")}').rstrip())
        print(f'VERDICT {verdict}')
    if a.save_ref:
        os.makedirs(REF, exist_ok=True)
        json.dump(cur, open(os.path.join(REF, 'summary.json'), 'w'), indent=1)
        open(os.path.join(REF, 'campaign.txt'), 'w').write(main_txt)
        open(os.path.join(REF, 'nearest.txt'), 'w').write(near_txt)
        rc, commit = sh('git rev-parse --short HEAD')
        open(os.path.join(REF, 'commit.txt'), 'w').write(commit)
        print(f'reference saved at {REF} (commit {commit.strip()})')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()

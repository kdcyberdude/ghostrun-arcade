#!/usr/bin/env node
// Cause-class table for the campaign: groups every over-8 px event of a campaign-compare run into clusters (events <= 6 frames apart) and classifies each
// cluster from its first big event plus the NATIVE rows just before it (no remake internals), so "what is left" is counted by cause, not by level.
//   node tools/harness/cause-classes.mjs <campaign-output.txt | -> [--trace=<jsonl>] [--json] [--list] [--levels=a,b] [--top=6] [--ref=<earlier --json output>]
// The input is the default campaign-compare output with ALL events listed (`--events=100000`, the gate does this); `-` reads stdin.
// Classes, first match wins: platform/lift (a platform within reach on any event) > horizontal/x-pinned (|dx| > 8 on the first big event) >
// ceiling bump (native vy flips from rising to falling by >= 2 in one row) > ledge jump/walk-off (the last native take-off before the cluster was a fall
// off an edge, or the cluster starts within 6 rows of a take-off) > enemy-near vertical (ENEMY note) > arc diverging later (everything else vertical).
// --list prints each cluster (level, first frame, size, class, subtype, note) for drilling into one class; --json is what gate.py stores/diffs.
import fs from 'node:fs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const src = args.find((a) => !a.startsWith('--')) ?? '-';
const tracePath = opt('trace', process.env.GATE_TRACE ?? 'evidence/local/native-trace-winning-route-ram-20261109.jsonl');
const only = opt('levels', '').split(',').filter(Boolean);
const top = Number(opt('top', 6));
const refFile = opt('ref', '');
const refClasses = refFile && fs.existsSync(refFile) ? JSON.parse(fs.readFileSync(refFile, 'utf8')).classes : null;
const text = fs.readFileSync(src === '-' ? 0 : src, 'utf8');
const rows = fs.readFileSync(tracePath, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const CLASSES = ['enemy-near vertical', 'ledge jump / walk-off', 'arc diverging later', 'ceiling bump', 'horizontal / x-pinned', 'platform / lift'];
const events = {};
const claimed = {};
let cur = null;
for (const l of text.split('\n')) {
  let m = l.match(/^(\d-\d)\s+frames\s+\d+ events\s+\d+ \(>8px (\d+)\)/);
  if (m) { cur = m[1]; events[cur] = []; claimed[cur] = Number(m[2]); continue; }
  if (/native-enemy-frames/.test(l)) { cur = null; continue; }
  m = l.match(/^\s+f(\d+) (\S+) x(-?\d+) y(-?\d+) dx(-?\d+) dy(-?\d+) vy(-?\d+) (.*)$/);
  if (m && cur) events[cur].push({ f: +m[1], area: m[2], x: +m[3], y: +m[4], dx: +m[5], dy: +m[6], vy: +m[7], note: m[8] });
}

const isBig = (e) => Math.abs(e.dx) > 8 || Math.abs(e.dy) > 8;
const grounded = (r) => r > 0 && rows[r] && rows[r - 1] && rows[r].vy === 0 && rows[r].y === rows[r - 1].y;
// Last native take-off (grounded row followed by an airborne one) within 60 rows before f: 'walk-off' when native is not rising right after it.
function lastTakeoff(f) {
  for (let r = f; r > f - 60 && r > 1; r--) {
    if (grounded(r - 1) && !grounded(r)) return { row: r, kind: rows[r].vy >= 0 && (rows[r + 1]?.vy ?? 0) >= 0 ? 'walk-off' : 'jump' };
  }
  return null;
}
function classify(cl) {
  const e0 = cl.big[0];
  if (cl.ev.some((e) => e.note.includes('PLATFORMS'))) return ['platform / lift', ''];
  if (Math.abs(e0.dx) > 8) return ['horizontal / x-pinned', ''];
  for (let r = e0.f - 12; r <= e0.f; r++) {
    if (rows[r - 1] && rows[r] && rows[r - 1].vy <= -2 && rows[r].vy - rows[r - 1].vy >= 2) return ['ceiling bump', ''];
  }
  const t = lastTakeoff(e0.f);
  if (t && (t.kind === 'walk-off' || e0.f - t.row <= 6)) return ['ledge jump / walk-off', t.kind === 'walk-off' ? 'walk-off' : 'takeoff-lag'];
  if (e0.note.includes('ENEMY')) return ['enemy-near vertical', ''];
  return ['arc diverging later', ''];
}

const table = Object.fromEntries(CLASSES.map((c) => [c, { events: 0, clusters: 0, sub: {}, levels: {} }]));
const list = [];
let total = 0;
for (const lv of Object.keys(events)) {
  if (only.length && !only.includes(lv)) continue;
  const clusters = [];
  for (const e of events[lv]) {
    const c = clusters[clusters.length - 1];
    if (c && e.f - c.end <= 6) { c.end = e.f; c.ev.push(e); } else clusters.push({ start: e.f, end: e.f, ev: [e] });
  }
  for (const c of clusters) {
    c.big = c.ev.filter(isBig);
    if (!c.big.length) continue;
    const [cls, sub] = classify(c);
    const t = table[cls];
    t.events += c.big.length; t.clusters++;
    if (sub) t.sub[sub] = (t.sub[sub] ?? 0) + c.big.length;
    const L = (t.levels[lv] ??= { events: 0, repro: c.big[0].f, reproSize: 0 });
    L.events += c.big.length;
    if (c.big.length > L.reproSize) { L.repro = c.big[0].f; L.reproSize = c.big.length; }
    total += c.big.length;
    list.push({ level: lv, f: c.big[0].f, big: c.big.length, cls, sub, note: c.big[0].note, dx: c.big[0].dx, dy: c.big[0].dy });
  }
}
const claim = Object.entries(claimed).filter(([lv]) => !only.length || only.includes(lv)).reduce((a, [, n]) => a + n, 0);

if (flag('json')) {
  console.log(JSON.stringify({ total, claimed: claim, classes: Object.fromEntries(Object.entries(table).map(([k, v]) => [k, { events: v.events, clusters: v.clusters, sub: v.sub, levels: v.levels }])) }));
} else if (flag('list')) {
  for (const x of list.sort((a, b) => a.cls.localeCompare(b.cls) || b.big - a.big)) console.log(`${x.cls}${x.sub ? ` (${x.sub})` : ''}  ${x.level} f${x.f} big ${x.big} first dx${x.dx} dy${x.dy} ${x.note}`);
} else {
  console.log(`cause classes: ${total} over-8 px events (campaign reports ${claim}${total === claim ? '' : ' - listing truncated or mismatched: run campaign-compare with --events=100000'})`);
  for (const [name, t] of Object.entries(table).sort((a, b) => b[1].events - a[1].events)) {
    const lv = Object.entries(t.levels).sort((a, b) => b[1].events - a[1].events).slice(0, top).map(([k, v]) => `${k}:${v.events}@f${v.repro}`).join(' ');
    const sub = Object.entries(t.sub).map(([k, v]) => `${k} ${v}`).join(', ');
    const d = refClasses?.[name] ? ` ${t.events - refClasses[name].events >= 0 ? '+' : ''}${t.events - refClasses[name].events}` : '';
    console.log(`  ${name.padEnd(22)} ${String(t.events).padStart(4)}${d} ev ${String(t.clusters).padStart(3)} cl${sub ? ` (${sub})` : ''}  ${lv}`);
  }
}

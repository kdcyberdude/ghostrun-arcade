#!/usr/bin/env node
// Compress the extracted game audio for the web without touching the originals: every WAV listed in data/audio-tracks.json becomes a mono MP3 in
// assets-web/audio/ (gitignored like assets/). Looped music is cut at loopEnd + a 1 s tail (the engine never plays past the loop end: src/audio.ts wraps at
// data/audio-loops.json), events/effects are kept whole. Needs ffmpeg + lame on PATH. --verify decodes every MP3 in Chromium (the real decodeAudioData) and checks
// the sample count against the WAV, the alignment/SNR against the source, and that the loop junction has no step larger than the source's.
//   node tools/harness/compress-audio.mjs [--src=assets/audio] [--out=assets-web/audio] [--bitrate=128] [--margin=48000] [--verify]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const src = arg('src', 'assets/audio'), out = arg('out', 'assets-web/audio'), bitrate = arg('bitrate', '128'), margin = Number(arg('margin', '48000'));
const tracks = JSON.parse(fs.readFileSync('data/audio-tracks.json', 'utf8'));
const loops = JSON.parse(fs.readFileSync('data/audio-loops.json', 'utf8'));
const run = (cmd) => { const r = spawnSync('sh', ['-c', cmd], {encoding: 'utf8'}); if (r.status !== 0) throw new Error(`${cmd}\n${r.stderr}`); return r.stdout; };
const frames = (file) => Number(run(`ffprobe -v error -select_streams a:0 -show_entries stream=duration_ts -of csv=p=0 '${file}'`).trim());
fs.mkdirSync(out, {recursive: true});

const plan = [];
let bytesIn = 0, bytesOut = 0;
for (const [id, t] of Object.entries(tracks)) {
  const wav = path.join(src, t.file), mp3 = path.join(out, t.file.replace(/\.wav$/, '.mp3'));
  const total = frames(wav), loop = loops[id];
  const keep = loop ? Math.min(total, loop.endFrame + margin) : total;
  run(`ffmpeg -v error -y -i '${wav}' -af atrim=end_sample=${keep} -ac 1 -f wav - | lame -S -m m -b ${bitrate} --noreplaygain - '${mp3}'`);
  bytesIn += fs.statSync(wav).size; bytesOut += fs.statSync(mp3).size;
  plan.push({id, wav, mp3, keep, loop});
}
console.log(`${plan.length} files: ${(bytesIn / 1e6).toFixed(1)} MB WAV -> ${(bytesOut / 1e6).toFixed(1)} MB MP3 (${out})`);

if (process.argv.includes('--verify')) {
  const {chromium} = await import('playwright');
  const chrome = process.env.CHROMIUM_PATH || ['/opt/google/chrome/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((c) => fs.existsSync(c));
  const browser = await chromium.launch({executablePath: chrome, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
  const page = await browser.newPage();
  await page.goto('about:blank');
  let bad = 0;
  for (const p of plan) {
    const head = Math.min(p.keep, 200000);
    const ref = Buffer.from(run(`ffmpeg -v error -i '${p.wav}' -af atrim=end_sample=${head} -ac 1 -f s16le - | base64 -w0`), 'base64');
    const res = await page.evaluate(async ({mp3b64, refb64, loop}) => {
      const bin = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const buf = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(bin(mp3b64).buffer);
      const x = buf.getChannelData(0), r = new Int16Array(bin(refb64).buffer);
      const score = (lag) => { let s = 0, e = 0; for (let i = 8; i < r.length - 8; i++) { const a = r[i] / 32768, b = x[i + lag]; s += a * a; e += (a - b) * (a - b); } return s < 1e-9 ? (e < 1e-6 ? 99 : -99) : 10 * Math.log10(s / Math.max(e, 1e-12)); }; // silent source: ok when the decode is silent too
      let best = {lag: 0, snr: -99}; for (const lag of [0, -3, -2, -1, 1, 2, 3]) { const snr = score(lag); if (snr > best.snr + 0.5) best = {lag, snr}; } // lag 0 wins ties
      let jump = null, typical = null;
      if (loop) { // step across the loop junction vs the largest step anywhere in the 2000 samples before it
        jump = Math.abs(x[loop.startFrame] - x[loop.endFrame - 1]); typical = 0;
        for (let i = loop.endFrame - 2000; i < loop.endFrame - 1; i++) typical = Math.max(typical, Math.abs(x[i + 1] - x[i]));
      }
      return {length: buf.length, ...best, jump, typical};
    }, {mp3b64: fs.readFileSync(p.mp3).toString('base64'), refb64: ref.toString('base64'), loop: p.loop});
    const okLen = Math.abs(res.length - p.keep) <= 1 && res.lag === 0 && res.snr > 15;
    const okLoop = !p.loop || res.jump <= Math.max(res.typical * 1.5, 0.01);
    if (!okLen || !okLoop) bad++;
    console.log(`${okLen && okLoop ? 'ok ' : 'BAD'} ${p.id.padEnd(24)} frames ${res.length}/${p.keep} lag ${res.lag} snr ${res.snr.toFixed(1)} dB${p.loop ? ` loop junction ${res.jump.toFixed(4)} (max step before ${res.typical.toFixed(4)})` : ''}`);
  }
  await browser.close();
  console.log(bad ? `${bad} files failed verification` : 'all files verified');
  process.exit(bad ? 1 : 0);
}

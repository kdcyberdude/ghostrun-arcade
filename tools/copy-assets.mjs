import { access, cp } from 'node:fs/promises';
import { isRuntimeAsset } from '../src/render25d/asset-policy.js';
// The standalone build carries only the supplied browser artwork/audio, never the reference executable.
// When the compressed audio exists (node tools/harness/compress-audio.mjs) it replaces the 200+ MB of WAVs in dist; without it the WAVs are copied as before.
const web = await access('assets-web/audio').then(() => true, () => false);
await cp('assets', 'dist/assets', { recursive: true, filter: (src) => !(web && /^assets\/audio\/.+\.wav$/.test(src)) });
if (web) await cp('assets-web', 'dist/assets-web', { recursive: true });
// Experimental 2.5D presentation (?view=25d): optimised models published by visual25d/tools/optimize.mjs.
if (await access('assets25d').then(() => true, () => false)) await cp('assets25d', 'dist/assets25d', {
 recursive: true, filter: src => isRuntimeAsset(src.replace(/^assets25d\/?/, '')),
});

import { access, cp } from 'node:fs/promises';
import { isRuntimeAsset } from '../src/render3d/asset-policy.js';
// The standalone build carries only the supplied browser artwork/audio, never the reference executable.
// When the compressed audio exists (node tools/harness/compress-audio.mjs) it replaces the 200+ MB of WAVs in dist; without it the WAVs are copied as before.
const web = await access('assets-web/audio').then(() => true, () => false);
await cp('assets', 'dist/assets', { recursive: true, filter: (src) => !(web && /^assets\/audio\/.+\.wav$/.test(src)) });
if (web) await cp('assets-web', 'dist/assets-web', { recursive: true });
// Experimental 3D presentation (?view=3d): optimised models published by visual3d/tools/optimize.mjs.
if (await access('assets3d').then(() => true, () => false)) await cp('assets3d', 'dist/assets3d', {
 recursive: true, filter: src => isRuntimeAsset(src.replace(/^assets3d\/?/, '')),
});

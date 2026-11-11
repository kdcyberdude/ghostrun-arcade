# Verification

This source package contains the independent gameplay simulation, browser renderer, level data and focused regression fixtures from the GhostRun research recreation.

## Release checks — 2026-11-11

- Combined 2D/3D source: **1,131 tests passed**, zero failures or skips, with one worker.
- Type checking and combined production build: passed on macOS.
- Both production views under `/ghostrun-arcade/`: loading progress, retry, keyboard remapping, conflicts, fullscreen, pause, sound and mobile layout passed; no browser errors. 3D download-failure recovery back to 2D and live 1K/2K/4K selection passed. [2D report](production-2d-check.json), [3D report](production-25d-check.json).
- Production gameplay/audio: eight captures passed, including keyboard movement/jump, pause, audio decoding/playback, mute and restart. The production page exposed no development bridge and requested no ROM, model or policy files.
- Full native campaign gate: unavailable because the original trace and stored baseline are missing from this backup.
- Recovered 3D renderer: **900/900 simulation snapshots and 15/15 audio events matched** the headless simulation and 2D view on the recorded route. No missing models, unmapped tiles, stand-ins or browser errors were reported on that interval. [Raw parity report](../visual25d/evidence/replay-equivalence.json).
- The parity run used ANGLE Metal on an Apple M4. At low quality and 256 × 240, its measured 3D render-plus-step time was 26.87 ms/frame; this is a harness measurement, not a claim of 60 fps at 4K. Wider scene and device coverage remains separate.

## Current long-route limitation

A fresh headless replay of the entire retained v1 action stream from the standard reset reached 1-2, then returned to the title after deaths. That open-loop replay does **not** establish a current 32-level clear in this browser build. The precise cause has not been isolated; the native legacy clock and accumulated gameplay drift must be checked before attributing it to one mechanic. The 900-frame renderer parity result remains valid, but does not resolve this native/rebuild difference.

## Different checks answer different questions

| Check | What it establishes | What it does not establish |
|---|---|---|
| `npm test` | Included mechanics and interface unit fixtures still pass | A complete native-equivalent campaign |
| `npm run build` | Type checking and static production packaging | Browser performance or game completion |
| Production/browser interface checks | Loading, controls, settings and rendering work in the checked browser | All devices, browsers or levels |
| Full native campaign comparison | Drift against a particular retained reference route | Robustness to every new input sequence |
| Shared-simulation renderer comparison | Rendering choice preserves the checked game state and sound events | Accuracy of that simulation against the native game |

## Research measurements

The development status records a passing full gate with 1,107 tests and a recorded-route comparison of 1,283 position events, 237 events above 8 px, and 94.6% walker agreement. These are historical results from the original development environment, not fresh measurements made by this source export. Later commits and local changes are not certified by those numbers.

The original project also reports three recorded-input browser campaigns through the visible 8-4 ending. Those were action replays, not new closed-loop wins by a trained player. The unfinished explorer's outcomes belong to its [model card](https://huggingface.co/kdcyberdude/ghostrun-smb-policy-v2).

## Reproducing reference comparisons

The native campaign gate needs `evidence/local/native-trace-winning-route-ram-20261109.jsonl` and its stored gate reference. They were not available in the transferred development backup and are not included in this public package. `data/levels.json` is generated; rebuilding it likewise needs the original observation inputs. The ordinary production build uses the checked-in compiled levels.

Do not create a new baseline merely to turn an unavailable comparison into a green result. Do not infer native fidelity from unit tests or from a successful build.

The public package intentionally omits private session histories, experimental reports, ROMs, reference binaries and model weights. Existing fixture files preserve their measured values and original test expectations.

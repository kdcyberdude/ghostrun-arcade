# Verification

This source package contains the independent gameplay simulation, browser renderer, level data and focused regression fixtures from the GhostRun research recreation.

## Release checks — 2026-11-11

- Exported source: **1,131 tests passed**, zero failures or skips, with one worker.
- Type checking and production build: passed on macOS.
- Production UI under `/ghostrun-arcade/`: loading progress, retry, keyboard remapping, conflicts, fullscreen, pause, sound and mobile layout passed; no browser errors.
- Production gameplay/audio: eight captures passed, including keyboard movement/jump, pause, audio decoding/playback, mute and restart. The production page exposed no development bridge and requested no ROM, model or policy files.
- Full native campaign gate: unavailable because the original trace and stored baseline are missing from this backup.
- Public release is 2D only. Recovered 3D code/assets are retained on `codex/recovered-3d-preview`; its first-level video is an experimental preview, not a 3D launch.
- Current full fixed-route replay reaches 1-2, then returns to the title after deaths. The first substantial sampled mismatch concerns stomp/bounce timing around source frames 3047–3072, followed by a missed pipe-top jump. No speculative gameplay fix or full native-equivalence claim was made.

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

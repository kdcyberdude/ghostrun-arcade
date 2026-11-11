# Mario reference model and assets for a Three.js recreation

This folder contains the trained reference player and extracted graphics/audio.
Use the player to explore controls, physics and visual outcomes; use the assets
when implementing your own game in Three.js.

## What is included

- **`model/pixel-player`** — Linux x86-64 inference executable with the trained
  policy embedded. No separate model weights, Python installation or GPU is
  required. Tested on Ubuntu 24.04 / glibc 2.39; older Linux systems are unverified.
- **`assets/graphics/`** —512 raw 8×8 patterns, 101 background blocks, Mario/Luigi/
  Fire Mario sheets, raw enemy-table sheets, 34 special-object composites and
  palette/layout metadata. The last 20 raw patterns overlap title command data.
- **`assets/audio/`** —41 WAV captures (40 audible, one intentional silence),
  including music, sound effects and speed variants, at 48 kHz, 16-bit mono.
- **`assets/screens/`** —title, 32 level starts and ending screenshots, with
  logical nametable references. These are not complete level maps.
- **`assets/three-assets.mjs`** —nearest-filtered texture loading, sprite quads
  and an orthographic camera helper.
- **`ASSETS_PREVIEW.png`** —quick visual overview.

The original training checkpoints remain in the training project. This handoff
uses the compact inference binary. Keep its `model/LICENSES/` folder intact.

## Run the model

Supply your existing authorized `mario.nes` separately. From this folder:

```bash
./run-model.sh /path/to/mario.nes
```

For the ROM already present on this machine, the working command is:

```bash
./run-model.sh /home/kd/Desktop/proj/llm_gameplay/roms/mario.nes
```

The process reads one JSON request per stdin line and writes one JSON reply per
stdout line. Enter these requests after starting it:

```json
{"op":"hello"}
{"op":"reset"}
{"op":"observe"}
{"op":"suggest"}
{"op":"auto","ticks":80}
{"op":"step","buttons":["right","b"],"ticks":4}
{"op":"step","buttons":["right","a","b"],"ticks":2}
{"op":"observe"}
```

`auto` lets the model choose buttons; `step` applies your buttons. `suggest`
returns the model's next buttons without advancing. `observe` returns the current
image without advancing. Only `step` and `auto` advance gameplay. One tick is
approximately 1/8 second of game time; each request allows 1–240 ticks. Send `reset`
when `terminal` is true, or whenever you want a fresh standard start.

Image replies identify a PNG under `screenshots/` in a unique session folder.
Open that path to inspect the result. A one-shot example captures ten seconds of
model play and exits:

```bash
printf '%s\n' '{"op":"auto","ticks":80}' | ./run-model.sh /path/to/mario.nes
```

For another agent, keep the same process's stdin/stdout open so observations,
manual inputs and model actions share one game history. Launch a separate process
for each independent parallel game; screenshot folders remain separate.
The full protocol and button aliases are in [model/README.md](model/README.md).
This model plays the original NES environment; it is a reference to observe,
not a policy trained for your new Three.js engine.

## Use the assets in Three.js

Read [assets/README.md](assets/README.md) for file layouts, atlas rectangles and
an import example. For code in this folder, import the helper from
`./assets/three-assets.mjs` and load, for example,
`./assets/graphics/player-mario-right.png`. Browser URLs must match how your app
serves these files. Use nearest filtering, no mipmaps, integer scaling and an
orthographic camera to preserve the original pixel art. Audio starts after a
browser user gesture.

`assets/graphics/graphics-manifest.json` describes observed palettes and block
rectangles. `assets/graphics/tables.json` retains source-derived sprite/layout
records. `assets/audio/audio-manifest.json` names each sound and its rendering
limits. Sprite index 0 is transparent; background index 0 uses the universal color.

## Verified scope

The original frozen model passed 10/10 standard fresh-start greedy all 32-level
runs with zero lost lives. The exact compiled binary separately completed the
same route. Recovery from arbitrary manual deviations is unqualified.
The asset extraction replay matched all 10,626 reference image hashes and reached
the ending; every moved file is checked against its existing manifest.

Raw enemy frames still require state-dependent assembly. Your recreation must
implement physics, camera scrolling, animation, clipping, priority and sound-event
scheduling. WAVs are finite renders; seamless loop boundaries are not finalized.
RGB matches the reference emulator's palette; analog NES equivalence is unverified.
The supplied helper has syntax checks; the separate recreation's current status
and remaining verification work are described below.

## Build the recreation

[BUILD_PROMPT.md](BUILD_PROMPT.md) is the complete implementation prompt for Codex
or another coding agent. Start a task in this folder and tell it to read and
execute that file. It defines reference exploration, all32-level implementation,
physics/visual comparisons, continued work and verifiable completion criteria.
[policy-player/README.md](policy-player/README.md) supplies direct screenshot
inference for both frozen Mario and Kage models. Its runner lets the model control
your actual Three.js simulation and records each image/action. The existing Mario
development bridge works with it; Kage needs its own engine using the supplied
adapter. Native wins are verified, but the first Mario Three.js probe reached
Game Over in 1-1. Treat this as a fidelity test, not a guaranteed winning player.

## Run the independent browser recreation

Node.js 18 or newer is required. The recreation uses Three.js and TypeScript;
it does not load the reference executable or ROM.

```bash
npm ci
npm run dev -- --port 5173
npm run build
npm run preview -- --port 5174
```

Open the local URL printed by Vite. Player 1 uses the arrow keys to move, Z or
Space to jump/swim, X or Shift to run/fire, Enter to start or pause, and Tab to
select one or two players on the title screen. Player 2 uses J/L to move, I/K
for up/down, U to jump, O to run/fire, T to select and Y to start at the title.
During play, the active player uses their own controls; Enter pauses for either
player. P also pauses, M mutes, and the page provides start, pause, sound and
restart buttons. Touch controls operate the active player.

For browser checks, set `CHROMIUM_PATH` to an installed Chromium-compatible
executable. On this machine, the following uses the installed Google Chrome:

```bash
export CHROMIUM_PATH=/usr/bin/google-chrome
```

Start the development server for checks that use its controller bridge. The
production browser check starts its own preview server.

```bash
npm test
node tools/audio-test.mjs
node tools/production-browser-test.mjs
npm run test:browser
node tools/lifecycle-browser-test.mjs
npx tsx tools/compare-physics.ts
npx tsx tools/replay-first.ts
node tools/compare-first.mjs
node tools/compare-browser.mjs
node tools/compare-campaign.mjs
npx tsx tools/compare-transition.ts
npx tsx tools/compare-water.ts
npx tsx tools/compare-water-fresh.ts
node tools/five-two-water-browser.mjs
node tools/five-two-sky-browser.mjs
node tools/cloud-ride-browser.mjs
node tools/shared-cloud-art-browser.mjs
node tools/eight-four-room-browser.mjs
node tools/lower-row-browser.mjs
GAME_URL=http://localhost:5175 node tools/three-one-block-integrated-browser.mjs
GAME_URL=http://localhost:5175 node tools/firebar-three-four-integrated-browser.mjs
```

The production browser check starts and stops its own preview server after
`npm run build`. Set `PRODUCTION_PORT=5300` if its default5197 is occupied. It exercises the visible controls and keyboard without a debug
bridge, and measures actual decoded Web Audio output through activation, pause,
mute and resume. The other browser checks require a running development server. They use Playwright
Chromium; install it with `npx playwright install chromium` if needed, and set
`CHROMIUM_PATH` to its executable. Set `GAME_URL` to use a
different server. Comparison scripts also require the locally retained reference
traces under `evidence/local/`; these PNGs and traces are deliberately ignored by
git. Their source capture/measurement tools are in `tools/`.
The lower-row browser check isolates static layers at declared map placements and
compares every recovered cell pixel with its held-out reference-image witness.
It reports unresolved fragment overlaps as failures and does not establish a
gameplay clear.

Before replacing comparison reports, preserve them and all referenced local PNGs
with `node tools/archive-verification.mjs REPORT.json [REPORT.json ...]`.
It records file hashes and rejects comparisons from different frozen builds.

For an immutable local development playtest build, run
`PORT=5177 node tools/snapshot-game.mjs`. It saves a versioned development build
under ignored `evidence/local/` and serves it with a source/data hash manifest at
`/snapshot.json`. This preserves controller access for tests. The ordinary
production build excludes that bridge. `node tools/stable-server.mjs` is also
available for development without hot reload on port5175.

Comparison commands report failures with a nonzero exit status. The first-level,
short land-physics and frequent-stroke water comparisons still contain known
failures at the fixed tolerances; a passing build does not override those results.

`data/levels.json` holds editable runtime level data. `data/observed-levels.json`
retains image-derived geometry and its uncertainties. `node tools/compile-levels.mjs`
regenerates the runtime data from those observations and the local reference
capture; it intentionally requires that evidence. A normal game build needs only
the checked-in runtime data and the supplied `assets/` folder.

In development, `window.mario` exposes reset, step, observe, pause and resume.
`step(buttons, frames, buttons2)` accepts an optional second-controller button
array and returns rendered pixels, requested steps and actual
advanced simulation frames. Paused/title updates may advance fewer simulation
frames than requested; retain both counts when comparing with the reference's
native `frames_advanced`, which also counts paused emulation time.
The separate `window.marioDebug` is for diagnostics.
Both objects are excluded from production builds. Recorded reference actions are
open-loop replay inputs. The original `model/pixel-player` cannot observe this
game, but the separately supplied `policy-player/pixel-policy` accepts actual
external PNGs. Its adapter tests run with `node --test policy-player/client.test.mjs`.
For a fresh closed-loop test against an immutable development snapshot, run:

```sh
CHROMIUM_PATH=/usr/bin/google-chrome \
  node policy-player/play-threejs.mjs --game mario --url http://localhost:5179 \
  --ticks 12000 --output evidence/local/mario-policy-unique-run
```

Use a new output directory for each attempt. This controller receives only actual
rendered images and its applied input history. Its journal records each exact
7/8-frame request and acknowledgement. A tick cap or Game Over is not a campaign
win. Keep the supplied policy executable and captures outside version control.
The optional controller attempts so far have not completed the campaign and do
not establish that the original reference policy observes the recreation.

`node tools/audit-gameplay.mjs TRACE.jsonl OUTPUT.json` independently reads the
retained PNGs to inventory visible worlds, Game Over, the ending message and
advancement errors. It supports browser-player and policy-player journals. It
does not certify a win: continuous controls, source binding and ending images
still require review.

The recreation remains under implementation. Three fresh browser sessions used
the development bridge to start at the title, press Start and replay an ordinary
controller route through the visible 8-4 ending. All 2,793 route inputs and
screenshots matched across the three runs. A visual audit identifies all 32 level
labels in order and sampled completion images. These are recorded-input replays,
not closed-loop control by the reference policy. The production build excludes
the development bridge and has a separate browser startup and controls check.

The retained local replay inputs and reports are named in `PROGRESS.md`; the
ordered visual audit is `evidence/browser-5422-campaign-visible-sequence-audit.md`.
Strict reference comparison failures remain, including the first-level animated
palette, the 6-3 pulley motor and 8-4 flame timing. Some level geometry, enemy
behavior and transitions remain inferred, and exact reference audio is not
measurable through the supplied interface. See `VERIFICATION.md`, `SPEC.md`,
`PLAN.md` and `PROGRESS.md` for tolerances, results and continuation state.

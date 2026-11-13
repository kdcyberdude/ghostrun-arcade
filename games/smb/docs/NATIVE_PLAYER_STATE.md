# Player state after a powerup transformation

Native `UpToFiery` passes Y0 to `SetPRout` for both mushroom growth and the fire
flower. That writes `Player_State=0` without clearing vertical speed, force or
fraction. Injury/death use `SetKRout`, which passes Y1 instead. These distinct
states matter when a powerup was collected in midair.

On the first subsequent `PlayerCtrlRoutine`, `PlayerPhysicsSub` may change
state0 to state1 if there is a fresh A press. Otherwise `OnGroundStateSub`
runs horizontal friction/movement and omits `MovePlayerVertically` entirely.
`PlayerBGCollision` selects default falling state2 before its offscreen
checks; a real floor contact can select state0 again. `FallingSub` on the
following turn uses `VerticalForceDown` even while A remains held.

The simulation now retains that source state across the transformation,
passes logical state0 to the existing horizontal motor, and performs the
horizontal-only turn without erasing vertical bytes. Its head probe still
reads the retained speed/force even though the vertical displacement is zero.
An unsupported state0 becomes falling without the ordinary walk-off helper's
speed reset. A genuine new jump uses the existing jump physics and clears the
native vertical fraction as `InitJS` does. No horizontal motor implementation
or camera arithmetic changed; no level or recorded-frame conditions exist.

`A_B_Buttons` is refreshed by actual player control, rather than each controller
read. `SaveAB` keeps copying that same latch during `PlayerChangeSize`. Thus A
pressed and held during the freeze can be a new press when control resumes,
even though it was held in the preceding PPU frame. The remake now retains
both native A/B bits from the collection turn for this first control turn.

Evidence comes from all368 native inputs/5,178,452 PPU samples, including all
four actual growth starts. Their state0 and unchanged A/B latch persist through
the transformation. No captured fire-flower transformation exists; its state0
setup follows the shared native `UpToFiery` source branch.

`native-player-resume-probe.cpp` independently verifies every RAM sample in the
12,495-row power-on baseline, saves the exact CPU/PPU state before collection,
and replays seven controller-only branches: recorded, held A, repressed A held
during the freeze, released A, B held during the freeze, and left/right control.
It never changes RAM or ROM. Every controlled975-row epoch has all15 strict
fields null in the remake, including exact fractional coordinates and native
A/B bytes. The repressed-A branch enters state1 and resets the fraction to0;
held A instead takes the state0 horizontal-only turn. Source code, RAM/pad
hashes and observer receipts are retained; the ROM and compiled binary are not.

Reproduce the native observer using the compile command in
`tools/harness/native-player-resume-probe.cpp`, then run:

```
/tmp/native-player-resume-probe <ROM> <capture/pads.bin> <capture/ram.bin> <pickup-row> <last-row> <output-dir>
npx tsx tools/harness/native-player-resume-events.ts --traces <v2-traces> --corpus <mood-corpus> --probe <observer.json> --branches <output-dir> --branch-capture <capture-SHA> --rom <ROM> --out tests/fixtures/native-player-resume.json
```

The selected input-only experiment is capture304c4e4adb88320f7a842b1a29580a03f83ecd36e8ac3bd04f8675dbf6427077,
pickup12431, last12494. These delimit a diagnostic experiment only; runtime
state transitions never read those identifiers or rows. The generator also
keeps the complete four recorded entry prefixes. Three match all15 strict
fields through resumed control. The fourth (a389925) retains earlier enemy
allocation mismatches at742/743/906, with every scalar/player field matching.
Those coverage limits remain explicit in the tests.

The full clean2-1 recording now has no death/time/score/coins/camera/Mario x/y
divergence; enemy position1379 remains a separate source shell/walker issue.
Its newly reported missing actor4863 follows that earlier enemy divergence.
Full before/after diagnostics are in `native-player-statezero-clusters.json`.
Predictive CPU/NMI overrun scheduling and full visual/pixel verification are
separate open work; these control branches do not claim to solve them.

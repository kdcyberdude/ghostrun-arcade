# Transformation completion and the same GameEngine pass

Native NMI handles `TimerControl` before `GameCoreRoutine`. A nonzero value is
decremented; if it stays nonzero, the NMI frame and interval timers hold, but
`FrameCounter` and the random register still advance. `SetPRout` initializes
that master byte to `$FF`. The player subroutine completes at `$C4` for growth,
`$C8` for injury blink, or `$C0` for the fire flower. These source comparisons
define 59, 55 and 63 player turns, rather than measured animation durations.

`GameCoreRoutine` calls `GameRoutines` first, then the rest of `GameEngine`.
`DonePlayerTask` clears `TimerControl` and selects engine8 during Mario's turn.
Mario does not execute another player routine on that turn. The following
enemy, block/misc, cannon, timer and parser passes can observe the cleared
master timer immediately. For example, native 2-1 global12490 has master
`$C5` before NMI, unchanged interval13, then master0/engine8 after the pass.
Mario remains at Y160 while the Para in slot4 moves X2638 to2637. The Piranha
in slot0 keeps its NMI frame timer37. Advancing a normal play frame would
incorrectly move Mario and decrement that timer.

`native-player-task.ts` implements the three source completion comparisons.
`Simulation.resumeWorldAfterTransform` executes the remaining world pass with
no player/camera motion. `nmiTimersHeld` distinguishes that main-loop motion
from the earlier held NMI timer pass. It preserves interval/game/frame timers,
including Piranha/HammerBro/Bowser timers and the still-separate frenzy-family
mirrors. Existing helper APIs default to their old timer tick behavior. Local
cannon countdowns keep running: `ProcessCannons` decrements `$047D`, which is
not an NMI timer. The ordinary enemy phase is aligned with actual `$09` after
the frozen player turns. There are no level or recorded-frame conditions.

The flag worker is separately centralizing the shared `$078F` clock before
player dispatch. When merging that work, keep its single common decrement;
do not restore legacy family decrements. It already observes the pre-dispatch
`powerChange` state and therefore holds this completion NMI correctly.

`tools/harness/native-player-task-events.ts --traces <v2> --corpus <moods>
--out <fixture>` authenticates all368 inputs and5,178,452 PPU samples. All346
adjacent transformation/injury rows and six completions (four growth, two
injury) match the source timer, engine, frame and unchanged interval bytes.
The fixture contains full pre/post RAM for all six completions. Every sampled
Piranha completion turn matches motion with its frame timer held, including
positive timer37 and49. No captured fire-flower completion exists; its source
comparison is implemented but has no recorded completion fixture.

The optional `--replay-entry <epoch> --replay-level 2-1 --replay-frames 971`
retains the complete clean mushroom epoch through its first resumed world
turn. Every strict field matches that prefix, with a separate assertion for
the held Piranha and interval timers. The following player turn still exposes
an independent source issue: `SetPRout` writes `Player_State=0`, so native
skips one vertical move before selecting falling state2. That existing player
state gap is not addressed by the world-resumption change.

`evidence/native-transform-resume-clusters.json` keeps diagnostic before/after
field tables for all four actual pickups. Two later changes need explicit
downstream qualification: capture371fe2f score3835→3833 and kind3830→3828
follow unchanged x/y617/614 mismatches; a389925 death null→2588 follows
unchanged missing/extra742 and position743. No v2 field changes. These tables
are diagnostics, not immutable integration receipts or full pixel coverage.
Predictive CPU/NMI work-cycle scheduling remains open.

The completion bank also runs `RunLargePlatform`/`LargePlatformCollision` after
`DonePlayerTask` clears `TimerControl`. Platform movement alone is insufficient:
Mario can land on or be carried by the platform without executing another
player-control turn. The resume pass therefore runs the existing native platform
contact calculation and retains its integer carry in `Platform_X_Scroll` for the
following scroll pass. Behavioral tests cover native lift and horizontal motors,
including the NMI interval hold. No captured transform-on-lift case exists yet;
these tests are source-order regressions, not a claimed native CPU capture.

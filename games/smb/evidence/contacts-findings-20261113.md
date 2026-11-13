# Native player/platform contact follow-up, 2026-11-13

Branch: `fix/smb-contacts`. Integration snapshots consumed: `50943ec`,
`efb1af0`, and `220f32a`; the main checkout was never switched. Native trace
source is the v2 RAM/pad bundle described in the external HANDOFF.md.

## Rules and evidence

- `YMovingPlatform` and `XMovingPlatform` use native speed, move force,
  position fraction and spawn FrameCounter. The old fitted trajectories were
  replaced by byte integration. Every id37/id40 trajectory is checked in
  `tests/native-platform-motion.test.ts`.
- `MoveDropPlatform` uses downward force127, cap2, only while ridden.
  `BalancePlatform` uses force5/10, cap3; the second platform owns the motor,
  while the first mirrors its integer movement. The previous slot fraction
  survives initialization. In3-3, drop slot2 leaves125, reused by the balance
  motor: contact599 changes force, first integer movement606. A later pair
  inherits55 from a red Paratroopa; that writer belongs to the walker changes.
- `MoveLiftPlatforms` preserves its native fraction and uses speed/force
  (-1,16) upward or (0,240) downward. Runtime no longer uses per-object fitted
  wrap phases. `CommonSmallLift` shifts raw parser X by12; wrapping lifts
  therefore enter at final X−315. Id37 enters at X−303.
- A platform is erased after its last motion when integer X<camera−72,
  irrespective of width. Its final X/Y bytes survive slot reuse. Id37 aliases
  $0401+s as `YPlatformTopYPos`; an id40 writes its actual X fraction there.
  Platform Y writes reach all currently integrated enemy byte consumers.
- A slot erased during its own pass cannot allocate a replacement platform
  until the following pass. Native1-2: Goomba slot0 erased1590; id38 lift
  initializes1591. Waiting wrapping lifts obey the same slot limit as id40.
- Player/platform contact uses Mario after his motion against the platform
  before its motion; feet overlap0..5 and nonnegative Y speed land, then the
  rider is put on the platform's current top. Mario's Y fraction survives.
- Native small lifts43/44 have two collision surfaces128px apart. Large
  lifts38/39 have only one. Actual recorded IDs were added to the geometry
  metadata; unvisited optional-water IDs were left unspecified.
- `ProcLPlatCollisions` underside and side checks use native bounding boxes.
  Side ejection changes integer X by1, zeroes the speed byte, preserves its
  fraction, masks the side, and sets the side timer. Ejection is excluded from
  `Platform_X_Scroll` (which contains only actual horizontal platform carry).
- Small Mario's inclusive X box is x+3..x+13; big and crouching Mario use
  x+2..x+14. The old fitted support span extended four pixels too far right.
  Platform contact ends jump state; otherwise walk-off gravity began early.
- Balance collision depends on slot order. An earlier motor slot reads its
  later first-platform slot's previous bounding box, including the previous
  camera offset. Native4-3 row784: player UL_X133 overlaps cached DR_X134;
  current DR_X131 is rebuilt later. Slot0 motor/slot4 first platform thus
  supports Mario one frame longer than a current-box-only check.
- `RunNormalEnemies` builds player collision boxes before enemy movement.
  Using post-step Goomba Y caused a false1-2 stomp1001, then Mario y1002.
- `PlayerBGCollision` returns outside screen page1 or at native Y≥$CF.
  `ImposeGravity` fall caps and stomp speed-byte writes preserve native force;
  special stomp kinds set byte−3, ordinary kinds−4. BlockBounceTimer suppresses
  a second block hit while preserving the native solid head bump.

`tools/harness/native-platform-rule-events.mjs` regenerates the portable
fixture of4487 distinct native platform transitions. No scratch probes were
added. Source routine names above are from the native SMB disassembly used by
this effort (`/tmp/smb-native-disassembly.asm` during the session).

## Current outcome on the refreshed integration

All32 levels were surveyed after each unit; no field moved earlier in the
final support/cached-box units.4-3 now has null death,time,score,coins,camera,
Mario X and Mario Y. Its only remaining field is red-Koopa enemy204.
1-3 and2-3 are entirely null on the refreshed integration.
3-3 Mario X/Y/camera are null after the integrated red-flight fraction writer.

Remaining examples are outside the corrected contact rule:

-The former1-2 y1667 was an initializer fraction-capture race, resolved in
 the follow-up below. The initial hypothesis of a wrong preceding Goomba
 fall motor was disproved by the atomic-initialization regression.
-6-3 y1652: downstream of a frenzy Bullet with the wrong height (enemy1611).
 Native Bullet slot1 y168; remake is80px higher and is falsely stomped1651.
-2-2 y1401 and7-2 y1522 remain underwater motion/entry issues.
-3-3 score/time near the flag remain the flag residue/timeline work.

The corresponding workers were sent these native rows. These are not claims
that all32 levels or pixel fidelity have reached zero; the integration owner
continues those remaining gates.


## Independent transition follow-up (integration0874db6)

- Down-pipe foot probes use integer X bytes.8-4 row6377 at x275.25 has
  right foot287, still on the left metatile before seam288; the old floating
  tolerance entered prematurely. Native entry occurs6405. Integer alignment
  moves the first timer error6400→6575 without earlier fields anywhere.
- GameTimerCtrlTimer ($0787) counts down through an already-active clock's
  pipe entry and rise, even though engine3/7 suppresses digit decrements.
  The final rise row switches to8 and consumes a pending zero immediately:
  8-4 row6574 is engine7/time133/control0;6575 is engine8/time132/control24.
  Initial automatic entry keeps FetchNewGameTimerFlag initialization, whose
  clock is initialized from the destination header rather than carried.
  This makes1-2 time entirely exact and moves8-4 time6575→6959.
- ProcessEnemyData cannot initialize a platform on task7 ($071F).4-2's
  x1980 up-lift threshold1665 is reached2015 after the previous32px scroll
  crossing, but initialization waits until2016. This removes all previously
  divergent4-2 fields, including Mario y2126 and later timer/score/death.
- Inherited X/Y fractions must be captured atomically when objectSlots assigns
  a platform slot. An extra slot-query caller (for example group allocation)
  can reserve it before the normal residue pass. Previously that pass queried
  an unseeded motor, overwrote the old fraction, then captured the already
  advanced value as the seed. The native4-2 regression checks136 at creation
  and152 after its first upward step. Atomic capture also removes1-2's final
  y1667 error; both1-2 and4-2 now have all eight divergence fields null.

The remaining8-4 first y6736 is a false stomp on a misplaced Beetle in area-2:
remake local296.5 versus native local232 on6735. Native enemy-slot/stream work
owns that issue; evidence was sent to the walker worker. Its timer error6959
now follows that earlier physical divergence. The all-level survey for this
follow-up is `/tmp/contacts-parser-platform3-divergence.json` during the session.


## Ordinary walker background phase (2026-11-13)

Base: integration e9c874d. Native `EnemyToBGCollisionDet` checks its
`(rawY+$3e)&255 >= $44` window, probes feet at x+8/rawY+24, and accepts
landing only when rawY low nibble is8..12. State0 stays horizontal; state1
runs native gravity61/256 with cap3. Landing snaps rawY to `(rawY&$f0)|8`,
clears speed/force while retaining the slot fraction, and makes non-Goomba
walkers face Mario. Spiny retains its FrameCounter-dependent direction rule.
A landing returns immediately; otherwise the side probe reads x+0/16 and
rawY+20 before movement. Native ID3 ledge avoidance remains distinct from
unwinged red ID1. Explicit off-grid artwork keeps its existing support height.

Reproducible fixture: `tools/harness/native-walker-landings.mjs`,113 native
state1→0 events, plus replay regressions8-2 row790 and6-1 rows246/247.
8-2 Koopa355→354.5 now matches its native pre-move wall reversal. The legacy
8-2 firstenemy625 remains earlier because of respawn state (other worker).

All32 comparison against e9c874d: only2-1 first fields change. Enemy517→791,
death1522→null, timer1529→1745 improve. Earlier y1916→1601, x1916→1602,
camera1916→1603, score2162→1800 all follow enemy791. Other levels and fields
are unchanged. Excerpts regenerated; full field snapshots are
`/tmp/contacts-walker-bg-baseline.json` and `/tmp/contacts-walker-bg-final.json`.

## Final void frame screen clamp

Mood0 SHA3d43b7b4… entry0007/1-3 row578 reaches native page6/rawY0.
`ScrollHandler` still clamps screenX240 to239 and clears the integer horizontal
speed byte before `PlayerHole` selects engine6. The previous early return
at pitEndFeetY skipped this final clamp. Moving the existing clamp ahead of
that return changes strict first578→579 (x578 is eliminated), with no change
to any field of the32 v2 runs. Strict579+ is the separately owned death/intro
RAM-retention gap: native engine0 retains the previous player/camera bytes
until area initialization; the current intro model resets them immediately.


## Source spring control, force and camera return

`ChkForLandJumpSpring` writes control1/timer3/force-7 after TimerCore;
`LandPlyr` snaps raw Mario Y's low nibble to0 without clearing position fraction.
`JumpspringHandler` then moves Mario+2 (control1/2) or-2 (control3/4), sets
spring artwork Y to fixedY+[8,16,8,0], and advances expired timers to4/control+1.
An A edge at control2+ selects force-12. Control4 launches on the13th contact
handler. That write changes only Y speed: Player_State is still ground0, so
one more grounded movement row holds Y, then background changes it to falling2.
The subsequent fall retains native $070A gravity, rather than always144/256.
65 captured handler rows reproduce all control/timer/force/artwork/Mario-Y bytes.
The old synthetic spring tests asserted inferred firstY144 and14-handler timing;
they are replaced by the generated native byte fixtures.

`MovePlayerHorizontally` returns nonzero spring control in A without moving X.
`OnGroundStateSub` nevertheless writes A to $06FF Player_X_Scroll, so camera
moves during compression even though Mario stays pinned. This is a source
accumulator effect, not a platform carry or per-level camera correction.
The runtime regression checks6-3 rows1944..1959, including exact camera values.

Versus3894521,3-1 dead1278/time1287/score1407/camera1014/x1026/y1013 all become
null; enemy924 is unchanged.6-3 dead2409/time2184/coins2620 become null,
camera1945→1993,x1957→1992,y1944→2082. The remaining6-3 errors follow the
missing spring slot reservation, owned by the walker worker.2-1 y1601→1602
improves; score1800→1795 and camera1603→1602 move earlier but follow enemy791.
No other level or field changes. Excerpts regenerated against the source rule.

## 5-3 delayed platform birth: persistent frenzy controller and final walker step

Base:8c3533e, merging integration4419a3a into this worktree while retaining
cd4a427 spring logic. The native enemy stream contains hard-only id23 records
at columns288/1312 (offsets0/14) in shared E_GroundArea7. `InitEnemyFrenzy`
retains a flagged NoRunCode object if $078F is nonzero or a frenzy Bullet is
already active; otherwise that slot becomes the new Bullet. A retained object
never calls OffscreenBoundsCheck, so it keeps its slot until area reset.
`native-controller-layout.mjs` derives these records from source bytes and
existing native area bindings. SecondaryHardMode gates the hard-only bit.
Entrance reconstruction consumes native EnemyDataOffset $0739 once and
reconstructs any still-flagged controller slots, preventing duplicate records.

Native5-3 row466 retains id23 at1312 in slot3; later frenzy Bullets use slot4.
The remake omitted that reservation, allowing id40 at1504 to initialize547
in slot4 instead of waiting for slot2. The falling red Koopa still occupies
slot2 through548 (rawY2/page2). On549 EnemyGfxHandler clears its flag/id/state,
but RunNormalEnemies returns through movement: state0 keeps vertical bytes
speed3/force61/fraction221 and advances X fraction56→184. The next slot pass
initializes id40 on550 with fraction184. The old e.y>=256 occupancy exception
mixed feet with native rawY and released this slot early; actual erasure now
controls release, with same-row reallocation blocked.

CommonPlatCode clears platform speed/force but retains Y fraction. The id40
primary-counter alias in $A0 is now written back every frame and checked on
all retained native id40 epochs, alongside the existing vertical motors.
Elapsed-age fixture epochs explicitly end on a native timer/engine/mode hold;
continuation after a hold needs the resumed FrameCounter, and is not claimed
by that fixture. Slot-state transitions total8492 measured native rows.

All32 first-field comparison:5-3 X618→1506 and camera619→1506; every other
field and level unchanged. The remaining5-3 physical error follows enemy1027.
Regressions check native controller466, Koopa final residue549, platform birth
550/slot2/fraction184, and Mario carry617..620. Controller slot records expose
id/x/y for the strict entity adapter; they have no rendered body.

## Vertical pipe engine3: saved scroll, raw Y, and continued GameEngine

Base:d911a44 (canonical integration404ca21 merged with controller927bb36).
`VerticalPipeEntry` adds1 to raw Player_Y_Position, calls ScrollHandler with
retained $06FF Player_X_Scroll and $03A1 Platform_X_Scroll, then decrements
$06DE ChangeAreaTimer. Neither X speed nor the position fractions are cleared.
ScrollHandler consumes platform carry and uses cached $0755, $0785 and $0723;
the ordinary camera arithmetic remains unchanged, with its saved byte now
retained explicitly. RenderPlayerSub's cached position write applies on land
as well as water, excluding the native injury blink rows and axe early exit.

SourceGameCoreRoutine continues the entire GameEngine enemy/item/platform and
parser pass during engine3. Only the final timer0 row clears OperMode_Task
and skips GameEngine. This fixes actors freezing during pipe entry as well as
camera inertia. Player collection/injury is suppressed outside normal control;
world physics continues. The existing native interval timer is ticked once,
not again by the reused generator pass. Bubbles/ColorRotation stop when the
pipe timer selects the loader.

The source helper matches144 captured engine3 state transitions (96v2 and48
additional mood0 rows). MoodSHA3d43b7b4… entry0000 (native source=local+216)
now matches camera, MarioY and actor positions through local461: X917 and
speed9432/4096 stay fixed; saved scroll3 gives camera805→808→810→812,
then stops below screenX80. Strict first414→462; all32 v2 legacy fields are
unchanged. Persistent mood excerpt and runtime regression cover413..461.

Remaining462 is the independent loader boundary: InitializeArea resets camera
while retaining the old Mario/enemy RAM, then clears the rest on463. The
source boundary table is /tmp/contacts-pipe-boundary.txt; castle worker owns
that pipeline. The existing sidepipe engine2 fitted first-speed path remains
open for a separate source EnterSidePipe/AutoControlPlayer unit.

## Solid head contact does not create an enemy-stun marker

NativeInitRedKoopa writes Enemy_State1; the placed ID3 initializer now retains
that initial falling state, and only state0 uses red ledge avoidance. Unwinged
ID1 stays distinct. A regression starts ID3 falling and verifies its first
landing faces Mario before state0 ledge behavior. This alone leaves all32
recorded firsts unchanged.

The new mood1-3 case6a33d619… entry0006 exposed the actual local196 error:
Mario hits a solid tree underside, receives native speed1, but the old generic
hitBlock path also killed the Koopa above it and paid an extra100 on201.
Native CheckForSolidMTiles uses thresholds[$10,$61,$88,$c4] by metatile high
bits. Solid head contact skips PlayerHeadCollision, so it never creates the
$23 marker consumed by EnemyToBGCollisionDet or starts BlockBounceTimer.
Enemy-above-block effects now require actual native block-object creation,
and only eligible block hits start the timer. The used-block regression is
corrected: the collision/bump sound remains, but no enemy is stunned.

Case6a33…/0006 enemy196 and score201 become null; all8 legacy fields are now
null and strict first196→946 (end transition). The native tree head bounce
itself remains unchanged. A persistent additional decision excerpt and runtime
196..202 check cover the live Koopa, unchanged score, and zero native timers.
All32 v2 fields remain unchanged versus74b1013. Full delayed $23 marker
lifetime and type-specific shell/stun conversion remain separate unverified
work; this unit removes effects from head contacts with no native marker.

## Source side-pipe motion replaces per-pipe first speeds

`EnterSidePipe` retains Player_X_MoveForce $0705 and replaces only the $57
speed byte with8, or0 once integer X's low nibble is0. AutoControlPlayer then
uses the ordinary player motor with Right/neutral input. Incoming absolute
speed, facing/moving direction, RunningTimer and RunningSpeed determine the
first and later friction steps. Engine7 selects right cap12; water ignores
RunningTimer's run class and uses the source floor cap16. No changes are made
to the already verified native-player-motor implementation.

The helper matches828 captured engine2/IntroEntr7 rows on X, speed, absolute,
facing/moving, running bytes and collision bits. It also matches every native
ChangeAreaTimer transition: initial$A0 on native camera page0, otherwise$34;
IntroEntr7's side check refreshes it while X remains unaligned, then the caller
decrements it. Runtime exposes the same pipeTimer for the loader worker and
uses source area origin to recover native camera page. The first-frame water
sync uses its canonical speed, absolute and moving/facing state.

All per-pipe firstSpeed values and runUntilStep approximations are removed,
as is the uniform automatic first speed2312. The original synthetic test's
speed vectors lacked their native incoming force/latch state and had required
those fits; exact byte fixtures now cover that behavior, while structural
runtime tests still require all five mouths to stop at aligned X. A closed
v2 1-2 replay checks1728..1735 X, speed, running timer, absolute and area timer.
All32 first-field values remain unchanged; full1628 tests and TypeScript pass.

The side engine2/IntroEntr7 full world/camera pass and the replacement of
fitted destination load durations remain separate work. The existing engine3
world pass is already source-driven. Animation ownership stays with the anim
worker: sidePipeStep has an explicit pre-friction absolute-speed hook for
GetPlayerAnimSpeed and subsequent single pose update.

## Native entrance setup prerequisite (2026-11-13)

`Entrance_GameTimerSetup` selects raw X from AltEntranceControl, raw Y from header bits3..5 (or the alternate-entry override), state0 and VerticalForceDown40. `nativeEntranceSetup` and `nativeEntranceAction` preserve those source tables and dispatch. The full 3d43 mood capture supplies60 native preload/fall/ready transitions, including the1-1 bonus room: source703 starts engine7/X24/rawY32/state0;704 changes to falling without vertical motion;705 starts gravity40;719 reaches rawY48;720 selects engine8 without moving;721 moves toY50. There are no room offsets in this rule. The existing compiled bonus spawn64.5 and custom age13 timer/physics remain a known fit; castle will replace them atomically with its source InitializeArea boundary. This commit adds the prerequisite helper/evidence only and changes no runtime replay fields. Canonical b3336f1 merged beforehand; all1680 tests and TypeScript pass.

## Native side-pipe world and camera pass (2026-11-13)

Engine2 and the side-pipe portion of engine7 call AutoControlPlayer, including ScrollHandler, before decrementing ChangeAreaTimer. The model now stores actual integer X movement into06FF, consumes03A1 and uses cached0755,0785 and0723 through the same nativeSavedScroll helper as engine3. All828 captured engine2/7 transitions match camera and06FF exactly from native incoming bytes. The shared pipe world pass continues platforms, enemies, items, generators, parser and graphics caches while the timer remains positive; the final timer-zero row skips GameEngine, bubbles and ColorRotation. Motor/world updates stop after that boundary instead of continuing until a fitted destination duration.

All32 legacy field first-divergence values are unchanged against `/tmp/contacts-b333-baseline.json`; v2 excerpts regenerated without changes; all1680 tests and TypeScript pass. The closed1-2 runtime test checks native scroll increments from the incoming state. Its camera was already native+2 before engine2 (row1725 model2519/native2517); this pre-existing strict error is preserved, with no runtime correction. Full loader durations, partial/full InitializeArea clears, and the automatic-intro NMI/interval-clock compensation remain castle-owned follow-up work. The source entrance prerequisite b859c08 supplies the header setup and fall/ready evidence for that atomic integration.

## Exact1-2 camera ownership: native WarpZoneObject (2026-11-13)

The inherited camera+2 starts at v2 row1717, rather than at side-pipe entry. Native row1716 AreaParser column178 command7 sets ScrollLock0723=1 after the camera pass. On1717 native ScrollHandler therefore holds camera2497 despite06FF=2. The enemy-bank WarpZoneObject (ID52, source E_UndergroundArea1 offset42/column2592/rawY112, slot2 since1642) then sees Player_Y_Position122 AND Player_Y_HighPos1 equal0, clears ScrollLock and erases itself. Row1718 resumes scrolling to2500. The model had neither the underground ScrollLock binding nor ID52 ownership, so it scrolled2px and gave the following Piranha slot2 instead of3.

Generated source area-control bindings now cover the already retained native block-buffer area mappings, preserving the special-slot `.areas` data and castle axe origins. Stream controller records include ID52 alongside ID23; ID52 reserves its ordinary enemy slot and uses the source bytewise Y/ScrollLock erasure test. The player pass snapshots ScrollLock before enemy updates, preserving actual source phase order despite the model committing camera after that loop. ScrollHandler arithmetic is unchanged.133 native ID52 lifetime rows and a closed1-2 slot/camera regression pass; the side-pipe runtime camera assertion now checks the absolute native value without the prior incoming offset.

Strict1-2 camera1717→1780, missing1716→1805, extra1717→null. Row1780 remains the known pipe timer-zero/InitializeArea boundary owned by castle; the strict coin position gap456 remains separate. Every legacy field on all32 levels is unchanged against `/tmp/contacts-b333-baseline.json`; excerpts regenerated without changes; all1683 tests and TypeScript pass. Warp text activation still uses the pre-existing area warp metadata; this unit does not claim complete source WarpZoneControl06D6 behavior or strict ID52 renderer/coverage support.

## Mid-page scene initialization after canonical parser-page seeding

Canonical227e3fc seeds NativeAreaControls from the initial ScreenLeft page. Its synthetic roof fixture begins at camera2457 within source page9, whose actual native InitializeArea camera is2304. Source PositionEnemyObj rejects an object left of ScreenRight, so the ordinary runtime loader must discard ID52 at2592 when first called at camera2457; however that persistent object was created earlier while scrolling from the page9 initial right edge2559. The synthetic scene omitted that retained owner while correctly restoring the parser page, leaving command7's lock without its native clearing object.

One-time page initialization reconstructs persistent ID52 records between the entrance page's initial right edge and the custom scene's current right edge. It does not alter runtime loader rejection or unlock rules. Captured entrance RAM always clears that synthetic reconstruction and restores exact native slots/consumed records from0739, so recorded runs never use an inferred owner. All six original roof/warp assertions pass unchanged; all32 field results unchanged versus the canonical merged baseline, all1755 existing tests and TypeScript pass. This is scene initialization compatibility, not evidence that arbitrary partial-page snapshots can reconstruct every prior enemy state.

## Strict platform-bank coverage (2026-11-13)

The opt-in strict audit now decodes every native platform ID36..44 into the enemy bank using its actual slot and raw X/Y anchor, including native Y pages. Simulation readout iterates the authoritative platformSlots map and queries PlatformMotion.collisionPosition at the current platformFrame. It uses explicit nativeId when available, otherwise the source kind mapping balance36/lift37/horizontal40/drop41; wrapping objects without nativeId remain explicit unsupported-sim-platform identity gaps. Small lifts produce one enemy-bank anchor, despite their two drawn surfaces. No observed camera threshold, sprite offset, nearest-object match, lifetime filter, or mismatch suppression is introduced.

The239 retained RAM samples cover native36/37/38/39/40/41/43/44; native42 is absent from v2 but has a direct raw-bank readout test. Tests also enforce slot identity, missing/extra lifetime failures, raw position errors, differing large/small lift kinds, and unresolved optional-water wraps. Existing held-platform position queries are repeated without advancing the motor. Full1760 tests and TypeScript pass; v2 excerpts regenerated.

Original32 strict survey: compared entity rows158945→178339 (+19394). Every legacy first-field value is unchanged. Newly exposed platform failures remain strict failures:1-4@1875;2-4@670;3-3@563;4-3@302;5-3@633;5-4@1054;6-3@239;7-4@524;8-4@674. No platform mismatch is reported for1-3 in this capture. The durable per-level table, full mismatch categories, counts and all32 legacy field values are in `evidence/strict-platform-survey-20261113.json`; raw full receipts are `/tmp/contacts-platform-strict-before.json` and `...-after.json`. The adapter does not claim these newly visible mechanics or other unsupported object families are correct.

## Source platform birth column and same-row ownership

Source DrawLargePlatform dumps Enemy_Y_Position directly into OAM; the NES sprite scan adds1 only for artwork, so strict raw collision anchors require no readout correction. The4-3 row302 and6-3 row239 errors were real missing birth ownership: native ID36 slot4 x768/y78 and ID40 slot3 x768/y112 were absent from the model map until the next row.

PositionEnemyObj compares a16-pixel enemy-data column to the current ScreenRight+48. Common platform initialization preserves X; balance initialization adds0/8 and wrapping lifts add12. Clearing the initialized anchor's low nibble therefore recovers the native column, yielding the eligibility threshold `(floor(x)&~15)-303` for every platform kind. Runtime no longer consumes fitted spawnCamera values. Existing slot allocation is explicitly queried after birth gating, so a platform is registered on the birth row even when there is no later ordinary enemy record to trigger a lazy slot query. An eligible unborn platform is processed even when a synthetic scene starts at/past the threshold; existing native corpse-slot/queue assertions pass unchanged.

All88 v2 platform initialization rows satisfy the source column bounds and init offsets; closed4-3/6-3 birth-row slot/anchor regressions pass. All32 legacy fields are unchanged versus canonical49d3fa7 plus strict adapter; excerpts regenerated. Strict platform firsts improve1-4 1875→1978,3-3 563→1164,4-3 302→1086,6-3 239→null. Full1763 tests and TypeScript pass. A first full runner stalled in its contacts Goomba animation child; a fresh complete run passed without terminating any process. The remaining4-3 1086 discrepancy is flag-engine platform freeze (native y211→210 while model holds211), separately coordinated with flag_end. Detailed per-level results: `evidence/strict-platform-birth-survey-20261113.json`.

## Platform world pass during native flag engines

GameEngine continues RunLargePlatform after FlagpoleSlide and PlayerEndLevel. The model's flag branch returned before incrementing platformFrame or advancing platform motion/OffscreenBoundsCheck. At4-3 native1086, slot0 ID37 x2176 changed Y211→210 while the model stayed211; it then persisted after native erasure1215. The corresponding3-3 extra balance object began1164.

A separate platform-only flag world pass now runs after player end-level action and before player pose, guarded by the same area and flag phase so the next area is not advanced. It performs platform collision/motor movement, fraction residue storage, slot allocation/gating and permanent offscreen release. Flag/NPC, music, generator and timer ownership remain with their existing handlers. All1116 native flag-platform bank rows of3-3 and4-3, including the eventually empty banks, match via a closed replay regression. Strict platform firsts3-3 1164→null and4-3 1086→null; every legacy field of all32 levels is unchanged. Excerpts regenerated; full1764 tests and TypeScript pass. Durable all32 report: `evidence/strict-platform-flag-survey-20261113.json`.

## Axe-touch skips the platform bank on the contact row

1-4 strict platform1978 was the source HandleAxeMetatile exit, not an anchor mismatch. GameCoreRoutine calls GameRoutines, then returns without GameEngine when OperMode_Task drops below3. The model incremented platformFrame before the player pass, so the horizontal motor's readout extrapolated one unused step (native X2157, model2156.81), even though no platform bank update occurred. Axe detection now precedes platform collision and cancels that speculative platform epoch before entering victory. Camera/player transition arithmetic remains unchanged.

The complete1389 native mode2 platform-bank rows of1-4 and2-4 match in closed replay, including later KillAllEnemies erasure. Strict platform1-4 1978→null and2-4's later horizontal3784→null;2-4's earlier small-lift freeze670 remains a separate enemy-slot ordering problem. All32 legacy fields are unchanged versus canonical0a8a1ec, excerpts regenerated, full1782 tests and TypeScript pass. Full strict receipts: `/tmp/contacts-platform-castle-before.json` and `/tmp/contacts-platform-axe-after.json`.

## Transform completion includes platform collision and carry

Canonicalbb2133a resumes the object bank on DonePlayerTask's completion turn, but omitted platform collision/carry. Source GameCoreRoutine executes GameRoutines (DonePlayerTask clears TimerControl/selects8), then GameEngine visits RunLargePlatform and LargePlatformCollision before motor movement. The resume helper now performs that contact pass and retains the exact integer carry in03A1; it does not execute a second player turn or tick held NMI timers. Regressions using actual native lift/horizontal motors failed before the change (feet96 versus97 and X1380 versus1379) and now pass, including landing/grounding and retained next-scroll carry. Existing11 actual native completion replays still pass; no transform-on-lift native recording is claimed. All32 fields unchanged; excerpts regenerated;1790 tests and TypeScript pass.

## Explicit platform motor clock and native enemy-slot turns

2-4 v2 row670: Bowser flame ID21 in slot0 hurts Mario and sets TimerControl255/engine11 before small lifts43/44 in slots2/3. Their raw Y246/54 and fractions80/240 must hold. The earlier attribution to firebar1 was incorrect; native-flame-contact.ts and source RunBowserFlame establish flame0 as the cause. Moving native flame items, firebars, and platform collision/motion into ascending native slot visits now holds later objects immediately while retaining earlier movement. The cached player collision box is preserved. Ordinary actor bodies are sorted by their held slot and observe the same timer guard; held initial-hit frame timers still receive their already-run NMI decrement.

Native horizontal/lift/wrap motor bytes now advance explicitly with actual FrameCounter and TimerControl at each object's turn. Rendering and collision queries read copies without changing RAM. This avoids deriving counter phase from elapsed display frames across transformation/injury holds. The actual native initializer API accepts all raw aliases for the shared-cursor followup. Balance/drop integration also records held turns instead of applying a global rewind. Existing component firebar motors remain separate compatibility readouts; native bank geometry and contact use FirebarSlots.

The pure motor matches15830 captured native byte transitions, including906 held turns, across IDs36/37/38/39/40/41/43/44. The extraction explicitly excludes new TimerControl onsets, area boundaries/loop teleports, and balance clamp/falling branches; these are not claimed by that isolated fixture. A separate closed225-row native2-4 replay covers the actual mid-bank hit and subsequent retained coordinates/speed/force/fraction. Its final row891 precedes InitializeArea's partial RAM clear892, which preserves flags but clears force/fraction; that boundary belongs to the loader. A clearly synthetic mixed-slot regression verifies an earlier moving horizontal platform, flame hit, and later held platform; no equivalent native recording is claimed.

All256 legacy first-field values of original32 are unchanged versus0dd2e36; strict2-4 platform mismatches are now null. Remaining strict platform failures are5-3@1127,5-4@1054 and8-4@674, retained without masking for source allocation/cursor followup. Excerpts regenerated;1795 tests and TypeScript pass. Durable table: evidence/strict-platform-clock-survey-20261113.json; full receipts /tmp/contacts-slot-dispatch-all32-gate.json.

## Castle loopback erases platform ownership on the loop row

Native ProcLoopCommand calls ExecGameLoopback, then the same KillAllEnemies used by bridge collapse: EraseEnemyObject clears flag/ID/state in slots0–4 and leaves movement aliases intact. The previous loop handler separately cleared ordinary enemies, flames and firebars, leaving platformSlots alive until the next ordinary slot query. 8-4 therefore retained its horizontal platform on both native loop rows674 and8750. The loop handler now uses the shared complete-bank erasure after FirebarSlots has retained its source pre-loop angle. Native platform clocks are erased and source records at/after the new ScreenRight are re-armed for later initialization; records before ScreenRight stay suppressed. Slot fractions/speed/force remain unchanged. No camera, loop-command timing, movement arithmetic or source cursor rule changed.

The fixture retains70 raw native loopback bank erasures (4-4:18,7-4:42,8-4:10); every after-bank flag/ID/state is zero. Closed runtime replays exercise all4-4/7-4 loops plus both8-4 loops preceding that run's existing player divergence, verifying immediate all-family bank release, retained movement residues and future platform record eligibility. The later8-4 loops depend on its pre-existing player/death divergence and are not claimed by the runtime test. Both8-4 strict platform errors674/8750 become null; every legacy first field of all32 levels is unchanged versus canonical766814a. Full1820 tests and TypeScript pass; v2 excerpts regenerated. Durable results: evidence/strict-platform-loop-survey-20261113.json.

The other assigned ownership firsts are downstream:5-3 horizontal-platform1127 follows enemy1027/death1125, while5-4 small-lift1054 follows enemy681/death937. On those rows the model has restarted while native remains in play, so changing platform allocation from those discrepancies alone would conceal the earlier actor errors. Shared source-cursor ownership is coordinated with castle; strict failures remain visible.

## Source firebar bytes, offscreen gate and slot residues

ProcFirebar calls GetEnemyOffscreenBits and returns on bit8. Otherwise, when TimerControl is clear, FirebarSpin adds/subtracts the ROM speed byte to58, carries/borrows intoA0, then masksA0 to31. IDs28/30 use speed56 (seven geometry units), while27/29/31 use40 (five units). Long IDs adjust raw high8/24 to9/25 even during a timer hold. InitShortFirebar preserves rawA0 and resets only58; release now returns both raw movement aliases. The old motor stored only modulo angle units, assumed speed40 and moved only for pivot screen X strictly0..255.

NativeFirebar profiles now decode the existing physical ROM stream/catalog and static scene origin, binding exact pictured centers `(sourceColumn+8,row*16+8)` to source ID/speed/direction. The existing `bar.x-4,bar.y-4` already denotes the correct native pivot: the earlier claim that it needed a4px shift was incorrect. Runtime drawing/movement uses nativeMiscOffscreen on that pivot; no coordinate shift or fitted phase was added. Getters return raw byte copies and never advance the clock. The source-managed API initializes an exact slot with id/high/low/speed/direction and suppresses the legacy camera loader.

A read-only ProcFirebar CPU entry/return observer replays all8 original castle captures from full-emulator entrances, verifying all67940 completed PPU RAM rows before retaining24704 call inputs/outputs. The pure port matches every observed A0/58 result and offscreen byte, including5466 timer-held calls,7368 offscreen calls and225 fast-speed calls. Closed live1-4 through541 and2-4 through670 regressions check1730 actual call results against runtime raw bytes, slot ownership and post-Proc erasure. Synthetic managed-init tests separately verify unmaskedA0255, held long-arm correction, pure readout and raw release; they do not claim additional native recordings.

The live proof also establishes OffscreenBoundsCheck erasure at pivot screen X−73 (strictly left of ScreenLeft−72), whereas the previous loader retained exactly−73. Existing batch loading releases the corrected boundary at frame completion, preserving its batch ownership order. The new source-managed mode performs the same erasure at the object's own turn, for the shared ProcessEnemyData factory. Erasing immediately inside the still-legacy batch briefly exposed a wrong-slot Podoboo birth at3-4 row672; that incomplete mixed scheduling was rejected. The proper loader-specific dispatch resolves3-4 enemy3434 and strict position3438 to null without changing any other legacy first field of all32 levels. Source-managed long-firebar alias allocation and other early5-4 birth gaps remain with the shared factory; no mismatch is masked.

All1851 tests and TypeScript pass; v2 excerpts regenerated. Before/after isolated baseline135f0d4 and final receipts are `/tmp/contacts-firebar-all32-before.json` and `/tmp/contacts-firebar-all32-safe.json`; durable all32 report: evidence/native-firebar-survey-20261113.json. Observer replay requires `RL_ROM_DIR=$S/roms`, the lab paths, parent recordings directory containingv2/.entrances, and the existing native venv; this avoids importing unrelated optional reward-image packages.

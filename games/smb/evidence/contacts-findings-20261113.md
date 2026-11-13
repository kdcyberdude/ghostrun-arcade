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

## Frenzy Bullet holds its own motor on the injury row

5-3 row633 has a fresh TimerControl255, engine11 and overlapping cached source player/enemy boxes. Native Bullet ID8 in slot0 retains X1514 plus fraction128 from the preceding row; the model committed its1.5px move to1513 before the existing generic injury handler set the master timer. Source RunNormalEnemies calls PlayerEnemyCollision before EnemyMovementSubs/MoveBulletBill, so the already-established per-object hurt transaction now also retains a frenzy Bullet's prior X when the injury actually stops native timers. Cannon ID51 runs through a different handler and is intentionally unchanged. No geometry, stochastic birth, stomp or defeated-motion rule changed.

A native-only extractor selects every original32 fresh-master row with a retained ID8/state0 and overlapping cached boxes; the one matching contact preserves its complete X/fraction/Y state. Closed replay through that hit and eight following held rows matches the live native-slot Bullet at1514.5. The regression selects its active, non-defeated, unreleased owner rather than historical erased Bullet objects retained in the roster. Existing cannon/frenzy defeated-motor and mixed-slot hold tests also pass. Strict5-3 position633→null, overall strict first633→1025 (the known checkpoint batch-loader gap assigned to the shared source cursor). All256 legacy first values remain unchanged;1853 tests and TypeScript pass, v2 excerpts regenerated. Full receipts /tmp/contacts-bullet-hurt-all32-after.json; durable evidence/native-bullet-hurt-survey-20261113.json.

## Long firebar duplicate flag and source initialization gate

5-4 enemy681 was a real runtime ownership error, not a firebar spin-byte error. Source InitLongFirebar calls DuplicateEnemyObj before adding4 to its front anchor: front slot2 is ID31 at372/116, while the lowest free slot3 holds flag130 and copied raw368/112. That reservation forces the next Podoboo at480 into slot4. The model reserved only the front and put it in slot3, reading the wrong random-register byte and eventually reaching rawY239 instead of native240 on681.

FirebarSlots now reserves the source duplicate alias during ID31 initialization. Aliases expose raw slot/flag/owner/copied coordinates, hold occupancy without running movement or an initializer, and clear their flag only on their own turn when the referenced owner flag is clear. A lower-numbered alias therefore persists until the next row if its later owner erases. KillAllEnemies clears normal aliases0–4 while preserving5, which clears at its next alias turn. The source-managed API creates this alias itself; the shared stream factory must not duplicate that reservation, and its busy callback supplies actual bank flags. Raw alias movement bytes are never reset or advanced.

A complete805-row native5-4 alias fixture checks every row from entrance through final erasure. It also exposed the missing AreaParserTask7 initialization guard: legacy firebar loading created the alias on81, while the source accepted ID31 on82. The runtime now uses the same parserClock.blocked gate as ordinary enemy records. Existing viewport component fixtures additionally exposed a previously invisible loader error: never-born, already-left long arms were initialized behind the native erase bound and their stale aliases consumed visible object slots. Viewport reconstruction now discards those erased records before alias reservation; source-managed loading continues to use its raw stream instead. No assertion was weakened. Synthetic tests separately exercise lower-alias ordering and slot5 erasure scope; no extra native capture is claimed for those arrangements.

All32 original v2 first fields are unchanged or later. Only5-4 changes: enemy681→1307; death937→null; timer938→1778; score/coins1331→null; camera/y1307→null; x1307→1704. All1902 tests and TypeScript pass; excerpts regenerated. Strict Firebar/alias coverage gaps remain explicit in the audit until their separate readout adapter is added. Source claims here concern the805 native flag/anchor rows and the runtime ownership correction, not complete5-4 fidelity. Full receipts /tmp/contacts-firebar-alias-all32-final.json; durable evidence/native-firebar-alias-survey-20261113.json.

## Shared0417 residue for flying and swimming Cheeps

7-3 slot3's launch on406 must retain native0417=32. The authoritative slotVertical fraction already held32, but updateFishFrenzy read the separate stale slotYFrac cache0, producing its first pixel error423 (nativeY171/model170). Launches now read the shared slot's actual fraction. Live flying motors and their erasure path write A0/0434/0417 back to that store and mirror legacy aliases for existing readers. A first2-3 gate exposed the same ownership issue in the other direction: its swimming Cheep predecessor left0417=130 on988, while the shared store held98. Native InitCheepCheep/MoveSwimmingCheepCheep keep A0=0 and repurpose0434 as originalY; those exact fields are now mirrored during live motion and erasure, with the water worker's source confirmation. No swimming motion or water collision rule changed.

InitFlyingCheepCheep calls SmallBBox before testing its native slot limit, so even a rejected slot clears A0/0434 while retaining0417. One observable native rejection7-3@1487 slot4 verifies that write. The3/4 limit now reads SecondaryHardMode directly rather than the scene's fixed maxFish value. Native accepted births retain their fraction in all38 captured cases, including28 nonzero values. The fixture retains6980 native flight rows from those births until erasure/state change or leaving the GameEngine bank;6940 movement/held transitions match the pure motor, excluding fresh mid-bank timer onsets that need separate slot-order evidence. Closed7-3 replay checks independent raw X/fraction/Y/speed/force bytes from406 through433, including the previously wrong423/427/433 positions. Synthetic tests separately cover native hard-mode limit selection and shared swimming/flying residue writes; they are not claimed as additional captures.

Versus canonical2179df4, all32 first fields are identical except7-3 enemy423→579, whose next first is the separate ordinary red-Koopa placement/slot error. 2-3,2-2 and7-2 retain zero legacy divergence. Full1924 tests and TypeScript pass; v2 excerpts regenerated. The one stale merged mood-report assertion concerned the Firebar adapter's newly closed coverage gap, not this runtime change; parent owns its genuine unsupported-family replacement. The test-only13dce11 compatibility commit is not a runtime dependency. Durable evidence/native-flying-slot-survey-20261113.json and /tmp/contacts-flying-slot-all32-after.json retain the per-level gate. No fitted Y correction or recording-specific runtime branch was introduced.

## Strict Firebar/long-alias readout, with raw phase failures retained

The strict adapter now reads every active native Firebar ID27–34 from its actual bank slot, full raw X/Y page anchor and Enemy_State, retaining A0(high),58(low),0388(speed),34(direction) and ID without masking. Simulation readout only queries FirebarSlots.slotOf/nativeBytes/aliasStates: the native pivot is declared flame center−4 in both axes; a long-arm alias holds the pre-initializer center−8 coordinates. Slot identity is mandatory. New first-field keys are firebar.id/high/low/speed/direction and alias.owner; equal pivots cannot conceal differing phase, speed, direction or ownership. No actor is allocated, advanced, re-slotted, matched by proximity, or removed by readout. Native aliases are mapped only when their currently flagged owner is honestly identified as a firebar. Unknown aliases and ID32–34 initializer/geometry coverage stay explicit gaps.

805 retained genuine full RAM samples include CPU shadow OAM from all8 original castle inputs; hashes and per-level active counts are retained. Original7-4 and8-4 have zero active firebars and zero ProcFirebar calls, so their examples honestly establish absence in those inputs rather than claiming unvisited phase/render coverage. Six executed visible pivots establish the native OAM contract (quad raw x/y, pictured center x+4/y+5). The adapter checks anchors and raw phase; it does not compare every6/12 radial component, sprite-budget flicker, clipping, palette or displayed pixels. Those remain separate geometry/render/pixel checks; the earlier24704-call motor proof does not by itself prove complete artwork. Closed1-4/2-4/5-4 prefix adapter checks retain the known partial-memory-clear speed gap as an explicit observed strict failure; synthetic tests prove wrong raw phase/ID/owner and wrong/missing lifetimes cannot pass. No existing assertion was weakened: the Hammer Bro strict snapshot gained explicit null expectations for the new fields.

All32 legacy first values are identical. Compared entity rows216070→241309 (+25239). Newly visible failures remain unmasked: firebar.speed at partial InitializeArea clear rows1-4@765,2-4@892,3-4@2211,4-4@5562,5-4@357,6-4@488, plus5-4 extra firebar1279. Native0388 is cleared to0 while the old flag/ID/A0/58/direction remain; the registry still retains ROM speed40/56 until its subsequent full clear. Castle/flag_end own the corresponding source load hooks. No original32 mismatch is reported for A0/58, ID, direction or alias owner. The full suite1906 tests and TypeScript pass, and the expanded805-sample fixture/prefix checks pass separately. V2 excerpts regenerated unchanged. Durable table: evidence/strict-firebar-survey-20261113.json; full receipts /tmp/contacts-strict-firebar-all32-after.json. This is additional failure detection, not a claim that original32 or visual coverage is complete.

## Vine enemy-bank strict readout (partial coverage, no runtime correction)

Source Setup_Vine uses enemy ID47, not the miscellaneous sprite bank. Slot5 controls VineObjectHandler; 0398 is segment count,0399 total growth,039A..039C the actual enemy-slot list,039D original raw Y. The handler grows only on FrameCounter bit1, ignores TimerControl, and erases all referenced segments when its native offscreen mask has bits2/3. Setup_Vine copies Block_PageLoc/X/Y but does not initialize Enemy_Y_HighPos or Enemy_State. In particular the second segment's raw RAM anchor is not the pictured position: DrawVine draws from slot5 relative coordinates plus48, using the second slot only for OAM allocation.

The tools-only adapter reads all native47 slots, full raw X/Y pages and state; primary simulation slot5 is read without allocation or mutation. Strict vine.count/height/startY/slots compare the shared native registers. An inactive declaration with the actual NativeSpecialSlot activation registry produces no fictional entity. An unavailable registry, an active pictured vine with no owner, retained primary Enemy_State, and secondary anchors/state are explicit coverage gaps. Missing secondary actors also remain strict missing failures; no raw anchor is guessed from DrawVine geometry. These gaps intentionally prevent a claim of complete active-vine coverage.

128 full native RAM snapshots (before/after64 neutral steps) were freshly captured from a hash-authenticated5-2 emulator entrance, injecting six documented controller states into the unchanged native engine. The real CheckFrenzyBuffer creates slot0's second segment at rawX0/Ypage0/Y0 while slot5 remainsX128/Ypage1/Y144; treating the secondary as slot5 Y+48 would conceal a genuine raw-state difference. The fixtures include active growth, forced limits, short-offscreen hold and whole-vine erasure; injected controller states are controlled native branches, not naturally visited playthroughs. Tests additionally label slot5 replacement with a powerup and wrong raw phase/anchor checks as synthetic. No claim is made for natural climb activation, every block-source copy, native slot-reuse after a natural vine, or pixel/secondary-OAM equivalence.

Focused28 tests pass (strict vines, existing special-slot native branch fixtures, strict entity checks and native Hammer contact prefix). Runtime files are unchanged. Full corpus/suite/TypeScript/pixel validation remains root-owned at the combined milestone; this adds strict coverage and may expose new failures without changing any legacy runtime field.

## Vine primary retained Enemy_State and source procedure proof

NativeSpecialSlot now owns its actual primary Enemy_State ($23). InitializeArea starts it at0; SetupPowerUp/PwrUpJmp authors1, the existing ordered powerup writer maintains its live state, EraseEnemyObject clears it, and Setup_Vine retains it. One-time entrance decode seeds the initial raw byte. Replacing a native powerup with a vine removes the former item's ownership without clearing the retained state. No generic unordered post-pass actor snapshot or replay-time RAM import was added. The strict primary vine now compares state; absent state and secondary anchor/state coverage remain explicit gaps.

A fresh isolated CPU procedure fixture executes the actual unmodified ROM instructions with controlled registers/RAM, synthetic JSR/RTS boundary and no PPU/NMI advancement.126 before/after pairs cover36 Setup_Vine retained state/Y-high combinations,54 InitEnemyObject secondary initializations,18 EraseEnemyObject and18 PwrUpJmp author writes. State seeds0,1,6,128,192,255 and Y-high0,1,2 distinguish retention from a forced0/1. InitEnemyObject itself clears secondary state before Setup_Vine, while JumpEngine leaves Y96: the block source addresses are $D6/$EF/$0137. Patterned input bytes prove these alias reads, not a guessed segment position or ordinary block0/1 copy. Implementing secondary runtime anchors still requires those bytes' actual owners; this tranche does not fabricate them.

A naturally visited input is retained from capture ff38f6f5ab48d512a04712f738589111f0dbe3a455ce60939a56cf70fb2d2796 entry7, level2-1. Its hash-authenticated full774-row input/RAM prefix reaches a vine naturally on726 and erases it after771. Every one of46 live primary rows matches flag/ID/state/X/rawY/Y-high; the actual retained primary Y-high is0, not1. This natural visit happens to retain state0; nonzero retention is proved by controlled native CPU branches rather than claimed natural visitation. Secondary native ownership slot3 remains an explicit gap/failure until its source alias state is implemented. No corpus/pixel completeness claim follows from this focused visit.

## Source-ordered EF scratch foundation, secondary vine still incomplete

The recovered source is doppelganger's public SMBDIS.ASM, pinned gist revision59e88c0028a58c6d7b9156749230ccac647bc7d4 (SHA256e5c17c42783f430029ab90aa37c73d51c2c320898e533b3ff196dad38c50ae42); persistent local copy /home/kd/.codex/worktrees/smb-native-reference-recovered/SMBDIS.ASM. NativeGraphicsScratch owns EF through actual simulation handler callbacks, initialRAM seed and explicit native full-clear callbacks. It is never updated by renderer/strict readout queries and does not drive movement, damage, score or current vine anchors. EnemyGfxHandler's Piranha early return preserves the prior byte; Cannon51 authors8 only in its surviving post-handler pass before fresh cannon births; Retainer53 authors21; Spring50 uses its source frame table; Bowser front/rear authors22/23; ProcFirebar authors its corrected spin high only when offscreen bit3 permits the handler. Unreconstructed IDs/handler clocks produce undefined, never an inferred zero. Defeated Bowser paths without an actual modeled graphics callback remain unclaimed.

360 actual isolated CPU before/after pairs cover328 ordered EnemyGfxHandler calls and32 ProcFirebar calls. Source calls include moving/held timer controls, Piranha rising/falling and frame timers, Cannon/Retainer/Spring/Bowser code substitutions, shared register carry between handlers, raw high255, long-arm correction and16 genuinely skipped offscreen Firebar handlers. The unchanged ROM procedures execute with controlled inputs and synthetic call boundaries, not a natural playthrough or pixel proof.

The retained natural774-row vine prefix independently compares every known EF value.771 rows match, with3 explicitly unknown group-birth rows220/451/695. The existing passNativeGroups reconstructs higher-slot graphics after the bank; at451 it replays Goomba6 after Piranha13 although the actual new follower's slot2 preceded Piranha slot3. This picture reconstruction is not an actual ordered EF write. Renderer/parser owner confirmed3349d81 does not close that graphics clock. The shadow register is therefore invalidated there until a subsequent real source handler writes it; the test retains exactly those3 gaps and does not count them as matches. Source Piranha graphics also sees the current NMI timer decrement even where its movement helper applies that decrement later; the scratch callback uses the same pending-timer ownership predicate without moving the physical timer.

The natural secondary slot3 previously held a Piranha: birth207 writes Y-high1; erasures483/724 retain1, and secondary vine birth726 retains that page while InitEnemyObject authors state0. Across that774-row input, D6 and0137 happen to be0 throughout; these observations are not runtime constants. D6 is second-fireball rawY, EF is the graphics register, and0137 is DigitModifier+3. Secondary vine anchors/state/ownership remain explicit strict gaps pending those byte owners and the source slot initializer. No full corpus, npm suite, TypeScript or pixel audit was duplicated for this foundation; parent owns combined validation.

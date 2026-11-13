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

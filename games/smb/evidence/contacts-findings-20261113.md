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

-1-2 y1667: a preceding falling Goomba leaves the wrong native fraction in
 slot0 (native76 versus remake146), inherited by the next upward lift.
-6-3 y1652: downstream of a frenzy Bullet with the wrong height (enemy1611).
 Native Bullet slot1 y168; remake is80px higher and is falsely stomped1651.
-2-2 y1401 and7-2 y1522 remain underwater motion/entry issues.
-3-3 score/time near the flag remain the flag residue/timeline work.

The corresponding workers were sent these native rows. These are not claims
that all32 levels or pixel fidelity have reached zero; the integration owner
continues those remaining gates.

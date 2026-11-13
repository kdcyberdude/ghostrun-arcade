# Additional native water decisions

The 336-run POWER-ON mood corpus contains 178 actual 2-2 water epochs and 38 later 2-2 ground-exit epochs. It contains no optional 5-2/6-2/7-2/8-4 water visits; those remain covered by the v2 recordings where visited. Source entries use the first engine7 row, with a one-time RAM snapshot initializer. NativeWater speed/force/fraction, stroke timer, whirlpool flag, horizontal state, prior buttons, cached scroll position, bubbles and live water actors are explicitly initialized; no later corrections occur. The generic area/HUD adapter is owned separately.

## First press from exact rest

Capture `d2bbd82bb5182db3aaf5c777b720352ef7b60d97f052d06100a3817277595132`, checkpoint epoch9, native setup25320: first left stroke25322 produces speed-304 and sets both facing/moving left. On25323 native friction adds plain152, yielding-456. The inferred water helper returned from its exact-rest branch without updating its internal facing/moving state. A source-seeded old facing right therefore doubled the second friction step, yielding-608. Updating both latches on that initial press reproduces source `PlayerCtrlRoutine` direction handling. Existing default-unknown facing had hidden this problem in some older helper tests.

Two new portable mood checkpoint snapshots (25320,26560) join six v2 water entry snapshots. Each predicts200 subsequent frames of Mario X/Y/camera, horizontal speed bytes, vertical speed/force/fraction and all bubble bytes/timer. The old rest branch fails these new snapshots; the corrected branch passes.

An independent diagnostic replays all178 water epochs from the same initial source snapshots on preserved commit7cc76d5 and the corrected worker. It compares RNG/counter, Mario integer coordinates/camera, horizontal force/fraction, vertical state, direction, water actor ID/X/Y and bubble slots/timer. Fully matching epochs increase31→32;85 per-field firsts improve, and7 epochs' earliest mismatches advance. No epoch's earliest mismatch moves earlier. Twenty-two later field firsts move earlier after an already retained or improved earlier mismatch; these are downstream trajectories, not new independent first failures. Full diagnostic files on this host are `/tmp/water-mood-baseline178.json` and `/tmp/water-mood-rest178.json`; these remain diagnostics, while portable native fixtures enforce the concrete source rule. All32 v2 first-field tables are unchanged.

## Next independently exposed source gaps

Capture above, epoch8: native19079 backs Mario one pixel out of a floor tile while his horizontal speed byte is0 (force72 remains). The remake checks zero-motion side probes but omits native deep-foot collision on that row. Other mood epochs expose additional independent contact/motor/actor cases; the complete corpus remains incomplete until those are resolved and the generic adapter reports all coverage explicitly.

## Deep-foot contact at zero horizontal speed

Native `DoFootCheck` probes X+3/X+12 and, for non-rising Mario at foot depth>=5, invokes `ImpedePlayerMove` using `Player_MovingDir`. This occurs before side probes and applies even when the speed byte is0. In the source example19078 hits the pillar, leaving speed byte0/force72;19079 backs X1236→1235 by one pixel and re-arms the side-collision mask/timer. The remake's zero-motion branch performed only side probes (feet134 put the side probes above the pillar), so it missed that row and resumed acceleration too early.

The water foot check now follows source probe/depth/order, reads the ordinary-pass Y/speed before late whirlpool gravity, and uses the retained moving direction when no horizontal displacement is produced. This is a source collision rule, with no replay timing or level thresholds. A portable1,100-frame snapshot regression includes this event and follows all Mario/bubble state bytes. It passes after the fix.

Full178-epoch comparison against12d83ac improves35 field firsts, advances2 earliest epoch errors, and raises fully matching checked RAM epochs32→33. No epoch's earliest mismatch moves earlier. Three later fields become earlier only after retained earlier independent mismatches (7df518ff epoch9: horizontal1744→1743 and Xfraction1756→1747 after first1342;5ed33322 epoch8: Xfraction941→940 after first939). All32 v2 first-field tables are unchanged. Representative epoch8's Mario X first moves1046→6036, exposing the independently missing source Blooper1680 at3995.

## Source enemy-stream cursor primitive

The old main-water roster is a set of visible sightings, not the full native stream. It omits unconditional Blooper1680 in2-2 and several hard-only entries farther right in7-2. Source `E_WaterArea2` starts at CPU$a171. `ProcessEnemyData` must retain `$0739` offset, `$073a` page and `$073b` page-select across frames. Hard-only objects are tested only after reaching their extended-right-bound window, so the hard-only1232 entry delays the later out-of-order1136 entry even in normal difficulty; filtering hard entries out of a flat roster loses this barrier.

The new pure cursor reproduces530,698 native completed engine7/8/11 cursor transitions across v2 and all captured mood water epochs, aggregated into17,699 distinct evidence cases. The native reserved-slot5 guard must precede page selection: a normal object cannot advance the page when slot5 probes it. RowE controls consume3 bytes, page controls recurse in the same slot attempt, and skipped/loaded ordinary objects consume2 bytes. Runtime allocation wiring is a separate slice; this commit only establishes the source parser and raw ROM data.

## Source stream allocation and controller ownership

Main-water areas2-2/7-2 now compile every Blooper prototype from raw E_WaterArea2 offsets and use the source cursor to decide actual births. The54 obsolete sighting-derived actor records (including fitted spawn camera/frame/stroke timings) are removed. Skipped hard-only and out-of-order records still consume their native parser attempt; visible sightings cannot substitute for this stream. This adds the omitted unconditional1680 Blooper and preserves future hard-only candidates without inventing spawn thresholds.

The pass visits source free slots0→5, respects the parser task7 guard, consumes queued frenzy initialization at its actual slot, and invokes buffer23 only where the parser falls through to it. Timer/height/RNG initialization therefore belongs to the exact slot rather than a final global lowest-free-slot guess. A queued23 that cannot become a fish retains its flagged NoRunCode controller owner. The shared NativeFrenzyController shape/module is identical to the contacts agent's927bb36 source-controller API; no nonwater allocation behavior is replaced. Raw X/Y residues, including reserved slot5, are preserved as the parser updates them. Source snapshot initialization seeds the cursor and those residues once.

Full178-epoch diagnostics improve123 per-field firsts and raise fully matching previously checked RAM epochs33→47, with no epoch-earliest regression;16 later field firsts shift earlier only downstream of retained earlier discrepancies. Added cursor/controller checks show zero NoRun controller flag/position mismatches in all178. Cursor-only firsts are global early-reset windows at engine6, or tied to an already incorrect camera; remaining normal-play cursor differences follow earlier Mario/actor errors. Checkpoint epochs9/10 in the representative d2bb capture now match every checked field.

Portable source snapshots now assert Mario horizontal/vertical bytes, coordinates, camera, all bubble bytes, every water actor ID/X/Y, cursor triples and NoRun owners across3,900 recorded frames, including the7-2 reserved-controller claim and newly exposed1680 birth. All32 v2 first-field tables remain unchanged. Optional water scenes still use their existing paths; this source allocation tranche is bound by ROM data to E_WaterArea2 only.

The main compiler calls the same source applicator used for the surgical generated-data update. A full compiler run still stops at the pre-existing absent `evidence/firebar-5-4-shared-verification.json`; it writes no partial levels file. The source water applicator is deterministic and idempotent, and only the two source-bound room rosters change.

## Low-byte reversal retains the native moving-direction latch

Capture `9c64d0397bb9660b2e0729f8fd64ed0bfe0fa432b828dfd337cd7fa93a0d5d1f`, epoch9, source20748: a left press leaves speed byte0/force88 after a right-wall contact. Native facing becomes left while Player_MovingDir remains right because PlayerCtrlRoutine updates it only for a nonzero speed byte. The generic ground motor incorrectly latched left from the input. On20749 source X_Physics first doubles friction152→304 from the old facing/moving disagreement, then GetPlayerAnimSpeed sees old absolute0<11, clears both speed bytes and adopts the old facing. The left ImposeFriction therefore produces-304; the previous helper retained force88 and produced-64.

Swimming now supplies the authoritative retained moving direction before horizontal control. The sub-byte reversal path applies the source reset in source order, including the friction computed before that reset; the wall collision bit blocking right cannot suppress a left press. A new1,600-frame source snapshot crosses this event and matches Mario/camera/motor, actors, cursor/controller and bubble bytes throughout. Portable water snapshots now cover5,500 frames.

All178 mood epochs show19 improved per-field firsts, no epoch-earliest regression, and2 later fields earlier only after the retained first375 in bdf6ae5a epoch10 (Xfraction377→376, bubbles502→387). Full32 legacy and strict first-field tables are unchanged. This increment fixes the verified zero-byte reversal; other inferred ground-motor paths remain separately exposed by the corpus and are not claimed exact.

## Water ScrollLock source binding and checkpoint-column audit

Canonical NativeAreaControls already implements ScrollLockObject; its data previously bound only castle scenes. Source water AreaData CPU$ae47 has row13 objects offset34/column80/command9, offset42/column96/command9, offset116/column192/command10 and offset118/column199/command7. Both2-2/area-2 and7-2/area-4 share this ROM stream with origin0. Adding these bindings supplies the existing generic source rule; no camera-end constant is added.

The9c64 epoch9 camera-only discrepancy is native source evidence:22047 has parser task4, column199, ScrollLock0, camera2821;22048 task3 toggles ScrollLock1 at the same column while camera reaches2822;22049 task2 retains the lock and camera2822 while Mario continues right. The source helper regression checks this task3/2 transition.

Checkpoint initialization is a separate canonical runtime issue, reported to the parent: v27-2 fresh engine7 row352 has camera0/parser column24, while checkpoint engine7/8 rows3112/3113 have camera1280/parser column104. InitializeArea starts CurrentPageLoc from the entrance/halfway page, then preload parses24 columns. Snapshot initialization already seeds the raw column; natural nonzero-page loads must not use the constructor's page-zero24 blindly. This data/tool slice retains the canonical helper unchanged and does not alter runtime loading.

The area-control generator now preserves the existing special-command .areas and control .streams/.bindings, and regenerates each bound source stream directly from ROM. Full39-area regeneration is byte-for-byte structurally identical to committed metadata, including every prior castle binding and special command. Runtime simulation is unchanged in this slice; parent integration supplies the canonical generic helper wiring.

The complete22 earlier downstream rest-latch field changes, each with its preceding retained firsts and native event, are preserved in `water-mood-rest-downstream.json`.

## Natural checkpoint parser-column initialization

The canonical control constructor now takes the initial ScreenLeft position. It translates that position to native coordinates using the source binding origin, derives InitializeArea's start page, adds the24-column screen preload, then converts the resulting column back to local coordinates. loadArea passes its initial camera. A scene origin is added and subtracted exactly once;8-4's source-origin256 room still starts at local column24.

Natural loadArea regressions use unmodified native7-2 RAM snapshots: fresh row352 starts at24, checkpoint rows3112/3113 start at104 from screen-left1280. No snapshot column override is used for those load assertions. Full32 legacy/strict every-field firsts are identical to the fair canonical39d merged baseline. All178 water epochs are byte-identical under the proper canonical snapshot initializer (60 completely matching checked-RAM epochs); explicit snapshot column seeding correctly overrides natural load defaults. The portable profile test now also seeds raw parser column/lock and extends9c64 to2,200 following frames, through native22048 lock/22049 camera hold; all6,100 portable frames pass.

## Neutral B stop uses the prior absolute-speed byte

Native GetPlayerAnimSpeed runs before ImposeFriction and compares Player_XSpeedAbsolute($0700) with11. Capture d2bb epoch8 source24068 ends at speed-2664 (byte-11/force152), absolute11. On24069 the old11 prevents ProcSkid from stopping; neutral floor friction adds152, reaching-2512 and only then writes absolute10. On24070 B clears both speed bytes. The inferred ground helper tested the magnitude of the full fractional speed instead and stopped at24069, losing one native pixel. Neutral water floor/air B-stop eligibility now additionally checks the authoritative prior absolute byte, as the source does. An airborne wall residue similarly survives B when its retained absolute is high.

Full178-epoch comparison improves167 field firsts and raises fully matching checked-RAM epochs60→67; no epoch's earliest mismatch moves earlier. The original d2bb epoch8 now matches all checked fields throughout its7,121 retained rows. Four later shifts follow retained/improved earlier errors:8cf3b831 epoch10 bubbles1039→1007 after first1002; acdccc03 epoch9 Y426→424 after earliest221→403;4403137e epoch9 RNG/counter2078→1638 after earliest695→1048. Full32 legacy and strict first-field tables are identical to9a1b23d. Portable cases now cover6,300 native frames, including a focused200-live-frame pre-death snapshot around24069; unused water-helper state is not compared across that case's later engine11 ownership change.

## Slow floor strokes use raw LR agreement, not a fitted speed cutoff

Capture169e3e3b117d67c5cefbc75d62fcd751b57c8fc7f673733f524fc0a481f77ebb checkpoint epoch9 starts14237.14239 first right press produces304.14240 Down+Right+A leaves native horizontal304 while initiating the upward stroke; the remake applied floor braking and returned152. Native ground input first masks LR due Down, the fresh stroke changes Player_State to swimming, and neutral masked LR skips swimming ImposeFriction. GetPlayerAnimSpeed still reads raw SavedJoypadBits, so low speed is retained if raw LR agrees with Player_MovingDir; disagreement can clear it only when old Player_XSpeedAbsolute<11. The previous helper exception retained only speed>=11, an incomplete empirical rule.

The floor-stroke retention gate now uses those source raw LR/moving and prior-absolute conditions. A500-frame native snapshot starting14237 predicts Mario, camera, full live water motor, actors, bubbles, parser and controllers. Full178 comparison improves85 per-field firsts, raises completely matching checked-RAM epochs67→72, and has no earlier per-field change at all. Full32 legacy and strict first-field tables remain identical. Portable snapshots now cover6,800 frames.

## Airborne zero-byte residue uses old facing/moving friction

Capture a9aa051457bcc42654c58c64413674af0866dea081ef145bedcc3254efe690ef checkpoint epoch9, source14788: horizontal force56 remains with speed byte0, old facing left and moving right; Down+Right+A must add the doubled friction304, producing360. The generic motor's old turnaround flag instead selected152, producing208. Native X_Physics computes friction from old facing/moving before applying the current facing. Down has no LR-masking role once airborne, so both source zero-byte direction cases now allow airborne Down.

The same-motion residue step now uses the old disagreement and clears generic skid/turnaround latches after facing aligns. That cleanup is required by the source's fresh X_Physics computation on the next row. Corpus gating caught a first attempt that left skid latched: d621 epoch10 source23532 correctly made392 but23533 incorrectly added304 instead of152 (native544). A full2,400-frame checkpoint fixture starting21184 now preserves this case and passes; a1,500-frame a9aa checkpoint fixture also passes. An arbitrary mid-skid23520 snapshot exposes an existing inferred-motor initialization gap on its next row and is not substituted for the full-entry source replay.

Full178 comparison improves19 field firsts and increases matching checked-RAM epochs72→73, with no earlier field change of any kind. Full32 legacy/strict first-field tables remain identical to3cef75d. Fifteen portable source snapshots now cover10,700 native frames, including the caught carryover regression.

## Up-only input participates in the native low-speed stop

Capture0a766fa4fee6a522569ef5c7fb56a7d73d3b4a863a742c0318bc1d21a833da17 checkpoint epoch9 source26385..26387 keeps wall residue32 through neutral/A-only input; cached absolute remains7 and moving remainsright.26388 Up-only clears both speed bytes. GetPlayerAnimSpeed checks SavedJoypadBits&$7f before masking LR; Up therefore triggers the low-speed stop when its LR0 disagrees with nonzero moving. The water helper previously received only LR/Down/B, so Up could not cause this source behavior.

The helper now receives Up for both floor and airborne control and uses the same prior-absolute<11 gate. A2,200-frame native checkpoint fixture includes this transition and follows Mario, camera, water state, actors, bubbles and source parser/owners. Full178 comparison improves52 field firsts and increases matching checked-RAM epochs73→76, with no earlier epoch-first error. Four later fields shift earlier only in52116322 epoch9, after its retained independent first1: Y3459→666, RNG/counter3653→867 and vertical3821→1020. Full32 legacy/strict field-first tables remain identical. Sixteen portable snapshots cover12,900 frames.

## Water enemies ignore block-bump background deaths

Native EnemyToBGCollisionDet's CInvu branch compares enemy ID with7 and returns via ExEBGChk for Blooper7/swimming Cheep10/11, before ChkUnderEnemy/HandleEToBGCollision can process a bumped metatile. The remake's generic hitBlock proximity loop bypassed this source gate and killed nearby water enemies.

Capture720e epoch9 source13440 keeps slot0 Blooper state0 at684,118 while the remake killed it;440313 epoch10 source21582 similarly retains slot2 grey Cheep1850,105. Mario/camera match at both first actor failures. Native scores remain70450 and80650 respectively through these bumps; the generic+100 award was also unsupported. The loop now excludes these native water actor kinds. Two700-frame checkpoint regressions preserve their actual source survival and subsequent movement.

Full178 comparison improves6 field firsts without an earlier epoch-first error. One later vertical field in8f908 epoch10 becomes1855 after earliest1139→1700. Full32 legacy and strict first-field tables stay identical. Eighteen portable snapshots now cover14,300 native frames.

## Preserve the post-contact pre-whirlpool sample

Native bubbles and normal enemies sample Mario before GameEngine's trailing ProcessWhirlpools. NativeWater.contact already rewinds that trailing pass, applies ceiling/floor contact, and reapplies gravity, but discarded its updated pre-pass state afterward. On a contact that moves again in late gravity, updateBubbles therefore read final Mario Y instead of the earlier source Y.

Capture01f49b100bcaeee2b85ce1076f73493186cae0e3b0d8fe179b43dc9553c70e46 epoch10 source16017 shows the resulting bubble0 spawn Y67 versus68, while Mario, bubble X, fraction, timer, enemies and RNG match. The helper now retains the newly recomputed sample and its actual moved pixels after contact. A900-frame native checkpoint fixture covers this case.

Full178 comparison improves4 field firsts, raises matching checked-RAM epochs76→78, and has no earlier per-field changes. Full32 legacy/strict first-field tables remain identical. Nineteen portable snapshots cover15,200 native frames.

## Grounded Down masks facing updates

Native PlayerCtrlRoutine clears Left_Right_Buttons/Up_Down_Buttons when Down and LR are held in ground state before calling PlayerMovementSubs. Raw SavedJoypadBits still controls the separate low-speed animation reset, but the masked LR cannot turn PlayerFacingDir. swimStep incorrectly updated the rendered player's facing from raw LR even when its horizontal helper had correctly retained the old facing.

Capturec91d9e96b7833bef2216b2e57ff5c61570e365a2e18d1fbd5ff93422c8812970 source25699..25702 holds Down+Right+B while grounded at Y176; facing/moving stayleft. The bubble spawned25701 is at MarioX2913, not right-facing2922. The facing update now respects the source ground Down mask, including the frame a floor stroke begins. A1,900-frame native checkpoint regression captures this bubble X and following state. This also corrects Mario's visual facing.

Full178 comparison improves5 bubble field firsts with no earlier per-field changes; completely matching checked-RAM epochs remain78 because other errors follow. Full32 legacy/strict first-field tables remain identical. Twenty portable snapshots cover17,100 native frames.

## Foot collision samples before late whirlpool gravity

Native PlayerBGCollision runs in PlayerCtrlRoutine before GameEngine's trailing ProcessWhirlpools. The remake moved Mario by combined ordinary+whirlpool displacement before its foot probe, unlike its already corrected enemy/bubble reads. Capture8d3816 epoch10 source26410 startsY92: ordinary gravity endsY95 (foot127), so no landing on tile128; the late whirlpool pass then moves toY98. The remake probed final foot130 and landed early atY96, clearing speed/force and taking the floor horizontal cap on the next row. Native lands on26411 instead and preserves fraction1.

Water foot lookup/depth now uses the cached ordinary-pass feet, and its rising check uses the ordinary-pass speed. The final physical Y is retained when no contact occurs. On actual landing, the existing contact helper replays late gravity from the aligned floor. A1,000-frame native checkpoint regression crosses this event.

Full178 comparison improves311 field firsts, increases matching checked-RAM epochs78→91, and has no earlier epoch-first error. Five later-field shifts follow retained/improved earlier errors:3a9d epoch10 direction becomes1820 after earliest817→1820; aaf815 epoch10 actors1231→1219, bubbles2019→1194, Y2144→1136 and cursor2199→1193 after retained783. Full32 legacy/strict every-field firsts remain identical. Twenty-one portable snapshots cover18,100 native frames.

## Pure source water horizontal foundation

The remaining horizontal/direction clusters still pass through inferred generic NativeMotor skid/turnaround state. A new independent nativeWaterHorizontal function directly follows PlayerCtrlRoutine's floor Down mask, PlayerPhysicsSub's accepted-stroke state change, X_Physics's cap/friction tables, GetPlayerAnimSpeed's raw non-A/direction/absolute logic, ImposeFriction's collision mask and directional cap, then PlayerCtrlRoutine's nonzero-byte moving-direction latch. Friction is recomputed from old facing/moving each pass; no previous skid class is used. Native RunningSpeed remains an explicit RAM input/output. The helper is not wired into runtime in this foundation slice.

A generator that never imports the remake reads502,199 normal-play water transitions from all32 v2 traces and all178 corpus water epochs, aggregated into28,337 distinct input/output cases. It verifies facing, moving, absolute speed, RunningSpeed, FrictionAdder and horizontal force on every transition. Where native later ImpedePlayerMove or screen bounds can clear the horizontal speed byte, source SideCollisionTimer16 or cached Player_OffscreenBits marks that later stage and only the retained force is asserted for the speed word; the control outputs remain fully checked. The other464,206 rows assert the complete speed word too. There are37,993 raw-state rows in that later-stage scope (including rows already at zero speed); this is a focused routine test, not a relaxed end-to-end comparator. Original native-divergence/native-strict and runtime remain unchanged.

The source screen marker uses cached horizontal offscreen bits rather than final Mario X: late whirlpool pull can move a clamped left-edge player from screen0 to1 after the clamp. An initial coordinate-based evidence classifier missed3f17 epoch10 source29595 for that reason; the cached source nibble resolves it without a fitted camera tolerance. The direct source function passes every aggregate case. Runtime integration must next preserve native collision bits and stage order rather than resurrect generic motor flags.

## Source horizontal routines now drive runtime water control

The validated nativeWaterHorizontal routine now drives swimStep. Its persistent state carries native direction bits, Player_XSpeedAbsolute, RunningSpeed and Player_CollisionBits. Background contact restores the collision bits for the native vertical page and masks the contacted side for the next control pass. The accepted fresh stroke selects ground/swim dispatch before X_Physics, so the former floor-stroke exception and generic skid flags no longer control gameplay. Raw Up/Down/A/B/LR flow through the source mask/order. The previous partial horizontal method remains only for historical research tools/tests.

The one-time native water decoder now retains raw facing/moving bits and RunningSpeed and seeds the new state directly. Eleven older partial research fixtures initially omitted these fields; their already known facing/moving/contact and non-stopped absolute bytes now initialize the new state as well. Native expected positions/speeds remain unchanged. The old synthetic surface-pillar test asserted friction on every alternating fresh Down+Right+A press, contradicting actual source RAM:5b3 epoch10 rows18028/18030/18032/18034 retain6064/5912/5760/5608 on accepted strokes atY16. It is replaced by an unmodified40-frame full native checkpoint starting18020, which preserves both coasting and fresh strokes. No replay comparator or tolerance changes.

Full178 comparison improves309 field firsts, raises matching checked-RAM epochs91→112, and has no earlier epoch-first error. Seven later-field shifts follow retained/improved earlier errors:7df518 epoch9 Xfraction1747→1745 and RNG/counter become2360 after retained1738;521163 epoch10 vertical becomes2555 after earliest1→919;acdccc epoch9 RNG/counter2793→2082 after retained403; a4b06 epoch9 direction4848→4664 after earliest3400→3893. Full32 legacy and strict every-field firsts are identical to63e8204/54f5d75. Twenty-two portable snapshots cover18,140 native frames. All1,653 tests and TypeScript checks pass.

## Source screen bounds and dynamic pit ScrollLock

Water now runs ScrollHandler's ChkPOffscr stage before BG collision and late whirlpool pull. It uses the existing exact native X offscreen-bit calculation, keeps the position fraction, clamps to ScreenLeft or ScreenRight minus16, and clears only the speed byte unless the source masked LR steers inward. The native horizontal helper exposes its already computed masked steering for this stage. Former late generic water clamps are bypassed; land behavior keeps the canonical scrollLocked snapshot.

The source water scroll amount is captured at that earlier stage, including the previous platform-scroll byte, and committed later without letting current-frame BG/pit changes alter it. The preview reads cached Player_Pos_ForScroll like ScrollHandler. PlayerHole explicitly writes ScrollLock1 after BG when the ordinary-pass Y high byte reaches2; the former oldBottom camera guard approximated this but did not update the source lock state. A first boundary candidate exposed two earlier pit errors because its preview still saw an unlocked camera; the explicit source lock and captured scroll amount resolve them. Root703's transform/ground-only logic and Player_X_Scroll output are preserved.

The d2bb25320 snapshot now runs1,000 frames through its caught page3 right-clamp regression; a new200-frame839557 snapshot starting17390 preserves the left-edge fraction case. Canonical703 baseline/candidate use fixed native entry metadata during the comparison. Full178 comparison improves61 field firsts, raises matching checked-RAM epochs120→135, and has no earlier per-field changes. Full32 legacy and strict every-field firsts remain identical. All1,789 tests and TypeScript checks pass. Twenty-three portable snapshots cover19,040 native frames.

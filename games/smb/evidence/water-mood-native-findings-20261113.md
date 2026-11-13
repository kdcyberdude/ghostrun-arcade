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

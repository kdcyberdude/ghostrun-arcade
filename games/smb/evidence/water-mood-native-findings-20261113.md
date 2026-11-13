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

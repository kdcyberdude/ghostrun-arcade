# Additional native water decisions

The 336-run POWER-ON mood corpus contains 178 actual 2-2 water epochs and 38 later 2-2 ground-exit epochs. It contains no optional 5-2/6-2/7-2/8-4 water visits; those remain covered by the v2 recordings where visited. Source entries use the first engine7 row, with a one-time RAM snapshot initializer. NativeWater speed/force/fraction, stroke timer, whirlpool flag, horizontal state, prior buttons, cached scroll position, bubbles and live water actors are explicitly initialized; no later corrections occur. The generic area/HUD adapter is owned separately.

## First press from exact rest

Capture `d2bbd82bb5182db3aaf5c777b720352ef7b60d97f052d06100a3817277595132`, checkpoint epoch9, native setup25320: first left stroke25322 produces speed-304 and sets both facing/moving left. On25323 native friction adds plain152, yielding-456. The inferred water helper returned from its exact-rest branch without updating its internal facing/moving state. A source-seeded old facing right therefore doubled the second friction step, yielding-608. Updating both latches on that initial press reproduces source `PlayerCtrlRoutine` direction handling. Existing default-unknown facing had hidden this problem in some older helper tests.

Two new portable mood checkpoint snapshots (25320,26560) join six v2 water entry snapshots. Each predicts200 subsequent frames of Mario X/Y/camera, horizontal speed bytes, vertical speed/force/fraction and all bubble bytes/timer. The old rest branch fails these new snapshots; the corrected branch passes.

An independent diagnostic replays all178 water epochs from the same initial source snapshots on preserved commit7cc76d5 and the corrected worker. It compares RNG/counter, Mario integer coordinates/camera, horizontal force/fraction, vertical state, direction, water actor ID/X/Y and bubble slots/timer. Fully matching epochs increase31→32;85 per-field firsts improve, and7 epochs' earliest mismatches advance. No epoch's earliest mismatch moves earlier. Twenty-two later field firsts move earlier after an already retained or improved earlier mismatch; these are downstream trajectories, not new independent first failures. Full diagnostic files on this host are `/tmp/water-mood-baseline178.json` and `/tmp/water-mood-rest178.json`; these remain diagnostics, while portable native fixtures enforce the concrete source rule. All32 v2 first-field tables are unchanged.

## Next independently exposed source gaps

Capture above, epoch8: native19079 backs Mario one pixel out of a floor tile while his horizontal speed byte is0 (force72 remains). The remake checks zero-motion side probes but omits native deep-foot collision on that row. Other mood epochs expose additional independent contact/motor/actor cases; the complete corpus remains incomplete until those are resolved and the generic adapter reports all coverage explicitly.

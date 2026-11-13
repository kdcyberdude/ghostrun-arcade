# Flag-phase parser completion and fireworks awards

The frozen336 report's40 independent1-1 score episodes include representative first differences1981,1932,2627. On current1f3a544 each comes from a missing native ID22 firework24 rows earlier, rather than an incorrect500-point award. Native RAM has finished AreaParserTaskNum($071f)=0; the remake's parser remained at task7 after crossing a32-pixel boundary near pole contact. Its correct birth guard then rejected every firework forever.

Source `GameEngine` visits enemy slots, processes the flagpole/timer/graphics, then executes `UpdScrollVar` for every engine pass, including FlagpoleSlide4 and PlayerEndLevel5. The VRAM_Buffer_AddrCtrl6 gate remains in that tail. Existing simulation play passes advanced its source parser, but the flag early-return path omitted the tail. The fix calls the same parser advance after flag actors/platforms/player graphics, using the actual camera delta and existing VRAM-busy state. Actor visits still see the pre-tail task, so this does not bypass the native loader gate or move a birth earlier within its frame. No collisions, actor factories, slot allocation, award table, music sequence or HUD packet rules change.

Portable native evidence preserves the entire first InitializeArea epoch from each original POWER-ON recording, initialized once at its first supported native entry. There is no flag/birth/award reseed. Native capture hashes, source-frame offsets and compressed initial RAM, complete pads and following RAM are in `native-flag-score-cases.json`.

-2ee38c5d:2083 frames, native state5/one firework, birth1957/award1981; score mismatch1981 becomes absent.
-b8aefd9f:2083 frames, native state3/three fireworks, births1908/1940/1972; score mismatch1932 becomes absent.
-61a4ffcb:2797 frames, native state3/three fireworks, births2603/2635/2667 across FrameCounter wrap; score mismatch2627 becomes absent.

All6963 retained frames pass strict comparison with no field differences or coverage gaps. The focused regression additionally checks every flag row's parser task/scroll, ID49 task/state/interval, FireworksCounter, FrenzyEnemyTimer, and each live ID22 slot/position/animation counter/timer. All7 births and all7 native500-point completion awards match. The three representative epochs cover2065 flag rows. Existing flag, ordinary-load, parser-clock and spring-lifetime regressions pass:69 focused tests; targeted TypeScript diagnostics for the new generator/test are0.

Generate with `native-flag-score-cases.ts --cache CACHE --hashes SHA,SHA,...`. This proves the three retained episodes, not all40 report episodes or the full336 corpus. Batch-level integration owns the next full state/pixel audit. No3D audit is part of this unit.

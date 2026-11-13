# Fireball and firebar picture phase

`DrawFireball` falls through to `DrawFirebar`: native FrameCounter `$09` bit2 chooses tile `$64/$65`, bit3 flips both axes. The source phase is `(counter >> 2) & 3`, including engine11 death while firebar movement is frozen. The renderer had used the global simulation frame, which survives area loads and therefore has the wrong phase.

The portable extractor checks 103,092 visible OAM pieces across the original32 traces, with zero tile/attribute disagreements, and retains one observed case for every counter byte. The renderer test also deliberately holds global frame0 while varying native FrameCounter, verifying the actual fireball draw call.

Native every-frame pixel comparison on 6-4 rows750–1050 now has **0 aligned differing pixels on all301 frames**. Receipt: `/tmp/smb-pixels-integration-firephase.json`; native input `/tmp/smb-native-every-frame`. This is an exact interval result, not whole-level or all-recording parity. Historical03aa75e includes firebar picture errors in this interval.

The browser verification also exposed a harness import defect: Vite does not resolve the explicit `.js` path to the TypeScript frenzy-controller module when imported by `native-entrance.mjs`. The harness now imports the actual `.ts` module; the Node/tsx and browser paths share the same implementation.

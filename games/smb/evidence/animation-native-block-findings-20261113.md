Native bouncing block pictures
==============================

DrawBlock uses the post-ImposeGravityBlock fixed-point position, not a sine bump of a background tile. Ground bricks use CHR85/86; other bricks use86 throughout. Used blocks use CHR87 mirrored across both axes, sprite palette3 on ground or1 elsewhere. The block draws even on its final row, before BouncingBlockHandler clears state and sets Block_RepFlag.

Physical nativeBlocks already exist for native misc clipping. A separate picture pass snapshots their position; the physics helper remains unchanged. BlockBackground overrides only rendering: PlayerHeadCollision queues a blank metatile in buffer1, then BlockObjMT_Updater queues the replacement after the sprite finishes and only when buffer1 is free. The existing native palette clock now also tracks pending buffer1 writes and delegates parser selection to the shared NativeParserClock. Coin/score writes and delayed game-timer writes retain that busy state across buffer2 NMIs. Collisions continue reading the physical tile map.

406 fully visible native DrawBlock OAM groups across v2 validate all four tile/attribute/position bytes. On the new independent mood1-1 recording, every picture155..175 around the first bump is exact0. Fresh same-baseline full462-picture comparison:2990 aligned differing pixels on24frames before;420pixels on11frames after. The remaining414+ cluster is native brick chunks, still drawn by the earlier debris items and outside this bouncing-block unit.

1584 tests and tsc pass; all256 legacy first-field divergences are unchanged relative to the4419a3a integration merged at17cefcc. Same-baseline all32 sampled pixel gates run separately. Existing nativeBlocks contact/misc-clipping tests remain unchanged.

Enemy pictures while TimerControl is set
=======================================

Native GmbaAnim skips its horizontal alternation when TimerControl $0747 is nonzero. CheckAnimationStop also ORs TimerControl before selecting the alternate sprite cell. The renderer previously stopped these changes only during power transformations, so FrameCounter kept changing live Goomba/Koopa poses throughout an arc death.

EnemyGfxHandler runs before contact in each slot. The new picture stamp retains that slot's TimerControl read on the contact row; when no handler runs on a later frozen row, rendering reads the live master-stop state. Death initializes TimerControl to255 and NMI decrements it. Pit/lava falls keep ordinary GameEngine motion and do not use this freeze.

Native first1-1 death retains207 Goomba OAM rows, including the contact row. Full runtime replay validates every tile/flip/position plus TimerControl truthiness. A separate ordering check retains the pre-contact flag on the slot's handler row. All209 compared pictures786..994 now have exactly0 aligned differing pixels. This fixes the recurring39-pixel8-on/8-off cluster.

1586 tests pass, tsc passes after import wiring; all256 legacy first-field divergences unchanged from b949176. All32 same-baseline sampled pixel check runs separately; no metrics or masks were changed.

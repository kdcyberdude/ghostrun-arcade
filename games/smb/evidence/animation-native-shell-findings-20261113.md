Native shell pictures
=====================

CheckForBloober skips CheckToAnimateEnemy while EnemyIntervalTimer is at least five. In its final four timer counts, a resting shell alternates using FrameCounter bit3. CheckAnimationStop freezes that alternate cell on TimerControl or state bitsa0, including a moving shell's bit7. The renderer's former age/8 rule animated resting shells throughout their interval and ignored native clock phase.

MirrorEnemyGfx also sets vertical flip for the bottom four sprites in state4. CheckUpsideDownShell/CheckRightSideUpShell increment rawY twice for both Koopa and Beetle shells. The renderer already applied this layout to Koopa shells; Beetle shells incorrectly used the ordinary enemy grid, two pixels higher with no vertical flip. The existing shell four-sprite path now handles Beetle cells19/20 as well.

A reproducible RAM/OAM fixture checks6,079 stable native shell pictures, retaining72 distinct cases from all32 v2 recordings plus64 independent mood revival windows. It verifies all four sprite CHR bytes, exact coordinates, and horizontal/vertical flip flags, including resting state4, moving state84, and interval values below five. The old renderer fails this fixture. No simulation state is changed.

The same e7a4561 baseline all32 sampled pixel gate for the native interval rule improves160,521→160,111 differing aligned pixels,786→772 nonzero frames; no individual compared frame increases. Beetle shells appear in original recordings only in8-2/8-4; their additional layout correction is gated separately against those complete sampled reports. Dense1-2 still has unrelated sprite differences outside the verified shell OAM; those remain visible and are not masked.

The final Beetle correction reduces8-4 sampled aligned pixels2,696→2,599 and leaves8-2 unchanged. Replacing those two reports in the all32 fair gate gives160,521→160,014 differing aligned pixels, with no individual frame increase. The OAM fixture now also verifies sprite coordinates and flip flags, not only CHR selection. Full1,737 tests and TypeScript pass; all32 native divergence reports are exactly unchanged.

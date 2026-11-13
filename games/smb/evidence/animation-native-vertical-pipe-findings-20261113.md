Native vertical-pipe player graphics
====================================

VerticalPipeEntry moves Y and calls ScrollHandler, but leaves Player_X_Speed and the animation reload unchanged. GameEngine still runs PlayerGfxHandler/ProcessPlayerAction every frame. The prior renderer fell back to age-based animation in phasepipe, while the simulation did not advance PlayerAnim there.

The source-action helper now runs for downward pipe entry without refreshing the speed-based reload (GetPlayerAnimSpeed belongs to movement routines, which this entry does not call). playerCell reads that native pose. Physical pipe motion is untouched in this unit; contacts owns the retained speed, Y and ScrollHandler runtime.

Native fixture:48 processed engine3 rows from v2 8-4 plus48 from the independent mood capture3d43b7b4 entry0000; every PlayerGfxOffset, facing, PlayerAnimCtrl/Timer/Reload matches. A sample with ModeTask0 is InitializeMemory, which clears the graphics offset without running PlayerGfxHandler; the diagnostic explicitly requires source ModeTask3.

The independent mood1-1 entry0000 now matches every one of462 compared pictures exactly on the aligned playfield (before:420 pixels on11frames after the native block unit). Native camera still moves during entry while the earlier remake camera is fixed; contacts is correcting that separate source-runtime issue.1587 tests and tsc pass; all256 legacy field-first values unchanged. Only8-4 has processed v2 engine3 before existing divergences; its sampled pixel gate runs separately.

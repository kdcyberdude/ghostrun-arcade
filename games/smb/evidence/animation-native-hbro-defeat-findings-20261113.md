Native Hammer Bro defeat pictures
=================================

EnemyGfxHandler reads captured Enemy_State bit5 to set VerticalFlipFlag, then swaps all three Hammer Bro tile rows and sets OAM vertical flip. Enemy_MovingDir remains the source facing direction during defeat. Native stomp sets state32; SetStun followed by ShellOrBlockDefeat produces state34. The renderer now consumes that captured bit immediately and keeps nativeDir while defeated.

The fixture independently reads508 full native six-sprite defeated pictures, covering states32/34 and both directions. It retains four distinct cases with complete CHR, XY and attribute bytes. Native Hammer Bro floatey scores always use GetAltOffset, so these body sprites remain owned by the enemy graphics handler. Both directions have bit7 set on every sprite; left facing also has bit6.

All1,905 tests and TypeScript pass. Regenerated excerpts and all256 first-field values match the211ec3b baseline. The fresh32-level sampled pixel gate reduces aligned104,976→104,551 (425 pixels), with improvements at3-1 frame930 and8-3 frame510, and no individual-frame increase in any all/HUD/field/aligned metric. HUD remains unchanged. Other picture gaps remain outside this unit.

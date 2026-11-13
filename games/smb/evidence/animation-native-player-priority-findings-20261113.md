Native player background priority
===================================

Authenticated independent entries start with Player_SprAttrib03c4 bit5 and the drawn player OAM bit5 set: Mario stands on a pipe with his bottom foot pixels behind its rim. NativePlayerCtrlRoutine clears bit5 after BG collision only when rawY>=64 and engine>=4 except5/7. PlayerEntrance's Ready-only row does not run that controller path. The initial OAM attribute must be seeded independently from stored03c4, just as native Star palette drawing retains its own snapshot.

The source model hooks are castle0244808 (merged locally979c5fa), using pure helper92e930d. The initializer now decodes stored03c4 and dynamic0202+06e4 bit5 separately; the2D renderer uses the drawn priority. The native full-prefix fixture checks both bytes and actual render depth over1,000 independent replay rows, including the initial OAM snapshot and the later controller clear.10,441 native stored/drawn cases independently verify the ROM guard. Full1,780 tests and TypeScript pass; all32 first-field JSON values are unchanged.

The genuine492e independent entry2 pictures0..107 now have zero differing playfield pixels across all108 pictures: the8 initial foot pixels are corrected, together with the prior OAM overlap fix. The all32 sampled fair gate remains102,787 aligned differing pixels on719 frames before and after, with no individual frame increases. It does not include initial frame0 by default, so the independent all-frame proof is explicit rather than inferred from that unchanged sampled metric.

The model's stored player-priority field represents03c4 when it owns player attributes. During blank ScreenRoutines, the144-byte VRAM_Buffer2 packet aliases03c4; those transient raw bytes are not a player attribute. The screen renderer suppresses player drawing there. Castle's source pipe lifecycle owns the corresponding load/entry transitions.

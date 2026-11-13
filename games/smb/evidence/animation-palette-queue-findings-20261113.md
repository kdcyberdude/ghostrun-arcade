Native queued palette display
============================

ColorRotation queues palette3 in VRAM buffer1. EndGameEngine's UpdScrollVar chooses buffer2 for RenderAreaGraphics and RenderAttributeTables; RemoveCoin_Axe also chooses buffer2 and skips that row's parser task. NMI clears only the selected buffer. Therefore ColorRotateOffset can advance while the visible question/coin palette waits for buffer1 to be selected.

The independent NativePalette model holds the visible rotation while buffer2 is selected. Its task/scroll transitions match 114,115 complete native v2 RAM transitions (506 distinct cases) over all32 levels. RemoveCoin_Axe's pair of horizontal 2-byte packets identifies the external buffer2 writer; that source path leaves Buffer2_Offset unchanged. The capture excludes incomplete native task8 NMI samples and nonadvancing FrameCounter boundaries. Example5-2row2178 is interrupted with task8, followed by row2179 with unchanged FrameCounter161 and task7.

Example1-1: row66 FrameCounter224 queues palette rotation4 with VRAM1offset7 while VRAMctrl6; row67 remains ctrl6; row68 returns ctrl0. The palette reaches the picture on frame69. Rendering the rotation immediately caused145 wrong question pixels on pictures67/68.

Dense1-1 pictures1..740:6330 aligned differing pixels over26 frames before;20 pixels on one frame after (739 exact frames). Remaining picture380 is Goomba foot-facing, sent to contacts owner. No masking or comparison changes. All256 legacy first-field divergences unchanged;1503 tests and tsc pass. All32 pixel sample surveys are running for final aggregate checks.

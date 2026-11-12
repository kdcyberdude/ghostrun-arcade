# Previews (Cycles CPU renders of the re-imported .glb files)
- previews/mario_turntable.png  8 azimuths, rest pose
- previews/mario_head.png  face close-ups (cap, M, eyes, moustache, ears, hair)
- previews/mario_poses.png  idle, skid, jump, fall, duck, slide, death, throw (two angles each)
- previews/mario_walk.png, mario_run.png  8 phases of each gait, pure side view
- previews/mario_recolor.png  Mario / Luigi / Fire by swapping the two cloth factors; mario_chibi.png  big vs `Chibi` morph
- previews/enemies.png  goomba, koopa (walk, front, fly with Wings), koopa shell
- previews/mario_loops.png  swim, climb, victory (6 phases each)
- previews/round2.png  piranha, beetle (+shell), spiny, blooper, cheep, bullet, lakitu, hammer bro, hammer, podoboo, bowser, bowser flame, koopa
- previews/npcs.png  toad, princess
- previews/items.png  mushroom, 1-up, fire flower, star, coin, fireball
Regenerate: `visual25d/blender/run.sh visual25d/blender/preview_mario.py -- all` (also `-- loops`, `-- gait`) and `preview_assets.py -- enemies|items|round2|npcs`.

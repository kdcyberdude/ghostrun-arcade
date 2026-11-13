World1-1 diagnostic catalog, historical pin002743d

This is a failure locator, NOT current readiness or continuous POWER-ON proof.
It was completed before the instruction requiring actual state/picture/joint
classification on EVERY frame after failures. The old strict comparator stops
rechecking each field after its first mismatch, although simulation continues.
Its "diagnosticComparedFrames" counts stepped frames, not actual matched rows.
No recovery totals can be inferred. Pictures and joint results are unchecked.
Future audits must continuously classify every frame, including after failures.

The producer tools/harness/native-world1-gameplay.ts is preserved verbatim:
SHA256 d541d8a276ecefc95222e27270a55f21ce11f67e66d7dbac565da1fc32a0277c.
Runtime002743dfae88405f9648d92cf675e4f7c513665f was unchanged during the run.
The later4d39 cannon-release change did not affect World1-1, as confirmed by the
integration owner; the historical artifact remains explicitly pinned002743d.

All336 authenticated mood inputs were scanned:458 native1-1 epochs,
1,178,867 native1-1 frames accounted,1,092,261 diagnostic frames stepped and
86,606 boot/control/entry frames explicitly unstepped.372 clips had no reported
checked-field divergence and86 had first failures in15 clusters. Those counts
are diagnostic results, not a continuous state or picture success rate.

The original recorded run was scoped to its2,853 native1-1 frames;167 following
1-2 frames were explicitly excluded. Its1-1 strict/legacy checks all passed,
4,777 entity rows checked, no gaps. This was also entrance-seeded, not POWER-ON.
Total accounted native1-1 frames including original:1,181,720.

The compact JSON stores all15 first-cluster examples, capture hashes, exact
local/source offsets and assigned owners. It preserves measured fields while
adding coordination annotations. Main/bonus transitions belong to Water,
pole/flag to Root, misc coins to Castle, group/lifetime to Renderer, pause to
Flag_end and the six Goomba block-bump cases to Contacts. These are historical
clusters, not assertions that each remains open on the integration tip.

Persistent complete diagnostics and authenticated source clips:
/home/kd/.codex/worktrees/smb-world1-gameplay-evidence/002743d/
  catalog.json (original producer output)
  entries.jsonl (all458 episode records with hashes/source ranges)
  examples/<sha>/<epoch>/{traces,receipts}/1-1 (bounded reproductions)
  original-scoped/{traces,receipts}/1-1
  original-1-1.json
Source captures:
/home/kd/Desktop/proj/ghostrun/notes/smb-native-handoff/recovered-native/moods/captures/

Two focused frame-accounting tests pass: boot/death/respawn/bonus/flag spans
remain accounted while the next world is cut; truncated RAM is rejected.
No new audit was run when packaging this checkpoint. The producer is retained
for reproducibility of this historical diagnostic only; it does not implement
the newly required continuous post-failure classification. No full suite,
TypeScript, corpus or picture gate was duplicated by this worker.

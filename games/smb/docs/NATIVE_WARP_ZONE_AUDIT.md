# Warp-zone controller strict readout

Native ID52 is an invisible enemy-slot object. `CheckRightExtBounds` writes its source row Y and sets YHigh to 1, `InitEnemyObject` clears Enemy_State, and `NoInitCode` leaves those coordinates unchanged. `WarpZoneObject` only checks ScrollLock and `(Player_Y_Position & Player_Y_HighPos) == 0`; it then clears ScrollLock, increments WarpZoneControl and erases its slot. Its lifetime therefore belongs in the actor audit even though it draws no sprite.

The strict readout compares the native slot, ID, X/page, Y/page and initialized state against the live `frenzyControllers` record. It reads current controller X, including its retained slot fraction before integer conversion. Unborn records and erased records are not active objects. Other unsupported controller IDs remain coverage gaps.

`native-strict-warp-zone.ts` extracts every ID52 row plus its erasure row from the original 32 native inputs. The portable fixture retains 135 raw rows from 1-2 and 4-2: 133 live slot rows and 2 erasures, with complete source input/RAM hashes. Tests compare every row and explicitly reject wrong coordinates, slot, state and lifetime. This is controller comparison coverage; it makes no claim that preceding gameplay or pixels match.

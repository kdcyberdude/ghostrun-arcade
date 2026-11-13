import {applyNativeLakitus} from './native-lakitus.js';
import levels from '../data/levels.json';
import {applyNativePiranhas} from './native-piranhas';
import {applyNativeWaterCoins} from './native-water-coins';
import type {Level} from './types.js';

// Explicit editable geometry and actors, compiled from image observations.
// Unresolved source cells and inferred mechanics remain documented with the data.
const nativeLevels=applyNativeWaterCoins(applyNativeLakitus(applyNativePiranhas(levels as unknown as Level[])));
export function observedLevels():Level[]{return nativeLevels;}

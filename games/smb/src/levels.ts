import levels from '../data/levels.json';
import {applyNativePiranhas} from './native-piranhas';
import type {Level} from './types.js';

// Explicit editable geometry and actors, compiled from image observations.
// Unresolved source cells and inferred mechanics remain documented with the data.
const nativeLevels=applyNativePiranhas(levels as unknown as Level[]);
export function observedLevels():Level[]{return nativeLevels;}

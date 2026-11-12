import levels from '../data/levels.json';
import type {Level} from './types.js';

// Explicit editable geometry and actors, compiled from image observations.
// Unresolved source cells and inferred mechanics remain documented with the data.
export function observedLevels():Level[]{return levels as unknown as Level[];}

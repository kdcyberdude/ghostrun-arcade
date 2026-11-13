/** Native placed Lakitu is present on its initialization-only parser turn. */
import {applyNativeLakitus as apply} from '../tools/native-lakitus.mjs';
import data from '../data/native-lakitu.json';
import type {Level} from './types.js';
export function applyNativeLakitus(levels:Level[]):Level[]{
 return apply(levels.map(level=>({...level,areas:level.areas.map(area=>({...area}))})),data.levels);
}

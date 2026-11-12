import longRules from '../data/long-firebar-native-lookup.json';
import {firebarOrientation} from './firebar-motion.js';
import type {FirebarMotor,FirebarFlameCenter} from './firebar-motion.js';

/** Native5-4 long arm: horizontal bins are skipped by its motor, never drawn. */
export function longFirebarFlameCenters(motor:FirebarMotor,geometry:{x:number;y:number}):FirebarFlameCenter[] {
 return (longRules.lookup[firebarOrientation(motor)]??[]).map(([dx,dy])=>({x:geometry.x+dx,y:geometry.y+dy}));
}

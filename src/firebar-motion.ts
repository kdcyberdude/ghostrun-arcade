import rules from '../data/firebar-motion-rules.json';

export interface FirebarGeometry {x:number;y:number;length:6}
export interface FirebarMotorParameters {direction:-1|1;initialUnits:number}
export interface FirebarMotor {active:boolean;units:number}
export interface FirebarFlameCenter {x:number;y:number}

/** Initial phase is measured object data; no universal native initialization is claimed. */
export function createFirebarMotor(parameters:FirebarMotorParameters):FirebarMotor {
 return {active:false,units:parameters.initialUnits};
}

/** Advance once per native gameplay frame. Pause, death and transitions pass false. */
export function advanceFirebarMotor(motor:FirebarMotor,geometry:FirebarGeometry,parameters:FirebarMotorParameters,camera:number,advancing=true):void {
 if(!advancing)return;
 const left=geometry.x-4-camera;
 if(!motor.active&&left<256&&left+8>0)motor.active=true;
 if(motor.active)motor.units=(motor.units+parameters.direction*5+1024)%1024;
}

export function firebarOrientation(motor:FirebarMotor):number {
 return Math.floor(motor.units/32);
}

/** One query supplies the same measured quad centers to rendering and collision. */
export function firebarFlameCenters(motor:FirebarMotor,geometry:FirebarGeometry):FirebarFlameCenter[] {
 return rules.lookup[firebarOrientation(motor)].map(([dx,dy])=>({x:geometry.x+dx,y:geometry.y+1+dy}));
}

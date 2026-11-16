import path from 'node:path';
/** Native capture folder of an audit inventory recording (pads.bin, initial.ram, ram.bin; pictures in pixelDir).
 * original:<level>   original32 trace, started from its saved entrance (receipt original32/entrances/<level>/entrance.json).
 * entrance44:<sha>   RL 4-4 entrance-attempt preview panel (ghostrun-lab runs/rl/smb-44-*), started from the saved 4-4 level start
 *                    (entrances.npy slot 15) after its 4 pad-0 restart frames; receipt capture.json (level 4-4).
 *                    SMB_ENTRANCE44_CAPTURES overrides the folder of these captures (default recovered-native/entrances44/captures).
 * mood:<sha>         power-on capture. */
export const recovered='/home/kd/Desktop/proj/ghostrun/notes/smb-native-handoff/recovered-native';
export function nativeCapture(input){
 const [kind,key]=input.id.split(':');
 if(kind==='original'){const dir=path.join(recovered,'original32/traces',key);return {dir,pixelDir:dir,level:key,entranceReceipt:path.join(recovered,'original32/entrances',key,'entrance.json')};}
 if(kind==='entrance44'){const dir=path.join(process.env.SMB_ENTRANCE44_CAPTURES??path.join(recovered,'entrances44/captures'),input.padsSha256);return {dir,pixelDir:path.join(dir,'pixels'),level:'4-4',entranceReceipt:path.join(dir,'capture.json')};}
 const dir=path.join(recovered,'moods/captures',input.padsSha256);return {dir,pixelDir:path.join(dir,'pixels')};
}

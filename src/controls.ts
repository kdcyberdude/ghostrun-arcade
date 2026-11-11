import {BUTTONS,type Button} from './types.js';
export type Bindings=Record<string,Button>[];
const DEFAULTS:Bindings=[
 {ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'up',KeyZ:'a',Space:'a',KeyX:'b',ShiftLeft:'b',ShiftRight:'b',Enter:'start',Tab:'select'},
 {KeyJ:'left',KeyL:'right',KeyK:'down',KeyI:'up',KeyU:'a',KeyO:'b',KeyY:'start',KeyT:'select'},
];
export const CONTROL_STORAGE='mario.controls.v1';
const KEY_CODE=/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Enter|Tab|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Backspace|Bracket(Left|Right)|Semicolon|Quote|Comma|Period|Slash|Backslash|Minus|Equal|Numpad[0-9])$/;
export const RESERVED=['Escape','KeyP','KeyM','KeyF'];
export function defaultBindings():Bindings{return DEFAULTS.map(map=>({...map}));}
export function readBindings(raw:string|null):Bindings{
 try{
  const maps:unknown=JSON.parse(raw??'null');
  if(!Array.isArray(maps)||maps.length!==2)throw 0;
  const seen=new Set<string>();
  for(const map of maps){
   if(!map||typeof map!=='object'||Array.isArray(map))throw 0;
   for(const [key,value] of Object.entries(map)){
    if(!KEY_CODE.test(key)||RESERVED.includes(key)||!BUTTONS.includes(value as Button)||seen.has(key))throw 0;
    seen.add(key);
   }
   if(!BUTTONS.every(b=>Object.values(map).includes(b)))throw 0;
  }
  return maps;
 }catch{return defaultBindings();}
}
export function rebind(maps:Bindings,player:number,action:Button,code:string):string|null{
 if(RESERVED.includes(code))return 'That key is reserved for the game menu.';
 if(!KEY_CODE.test(code))return 'Choose a letter, number, arrow, or standard keyboard key.';
 if(maps.some((map,i)=>code in map&&(i!==player||map[code]!==action)))return 'That key is already assigned. Choose another key.';
 for(const [key,value] of Object.entries(maps[player]))if(value===action)delete maps[player][key];
 maps[player][code]=action;return null;
}
export function keyLabel(code:string){return ({ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Space:'Space',ShiftLeft:'Shift',ShiftRight:'Shift',ControlLeft:'L Ctrl',ControlRight:'R Ctrl',AltLeft:'L Alt',AltRight:'R Alt'} as Record<string,string>)[code]??code.replace(/^Key|^Digit|^Numpad/,'');}
export function keysFor(maps:Bindings,player:number,action:Button){return [...new Set(Object.entries(maps[player]).filter(([,v])=>v===action).map(([k])=>keyLabel(k)))].join(' / ');}

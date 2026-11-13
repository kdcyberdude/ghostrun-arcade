import type {NativeLevelLoad} from './native-level-load.js';
/** The next PPU picture after ScreenRoutines: the NMI selects the queued VRAM
 * writes and DisableScreenFlag. No elapsed screen-row constants are used. */
export function nativeScreenPicture(n:Pick<NativeLevelLoad,'task'|'engine'|'screen'|'disable'>,water:boolean){
 const world=n.disable===0&&(n.task===0||n.task>=3);
 const message=n.task===1&&n.disable===0?(n.screen===5||n.screen===6?'time-up':n.screen===7||n.screen===8?'lives':undefined):undefined;
 const backdrop=n.task===0||n.task===1&&n.screen===0?'retained':n.task>=2||n.screen>=11?'area':water&&n.screen===10?'water-palette':'black';
 return {world,player:world&&(n.task===0||n.engine!==0),hud:world||message!==undefined,message,avatar:message==='lives'&&n.screen===7,backdrop};
}

/** Universal PPUpalette0 persists through InitializeMemory. Palette3 from
 * InitScreen clears it; the water palette and GetPlayerColors then replace it. */
export function nativeScreenBackdrop(previous:number,picture:ReturnType<typeof nativeScreenPicture>|undefined,areaColor:number){
 return !picture||picture.backdrop==='area'?areaColor:picture.backdrop==='retained'?previous:picture.backdrop==='water-palette'?0x22:0x0f;
}

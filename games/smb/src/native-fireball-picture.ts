/** DrawFireball and DrawFirebar share tile $64/$65 and both flips, driven by native FrameCounter $09. */
export function nativeFireballPhase(counter:number){return (counter>>2)&3;}

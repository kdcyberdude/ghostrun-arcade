/** Native FirebarCollision, run per flame as it is drawn. A flame is one 8x8 sprite; the remake's flame centers sit at sprite (x+4, y+5).
 * Vertical: Player_Y_Position (feet - 32, this frame) plus 24 for small or crouching Mario, else plus 0, then 12 ($0C), then 24 ($18) (FirebarYPos),
 * each against the flame's sprite y: |dy| < 8, and no hit for a flame at sprite y >= 240.
 * Horizontal: Mario's first OAM sprite x + 4 against the flame's sprite x: |dx| < 8 (8-bit). The OAM x is the one PlayerGfxHandler wrote on the
 * previous frame (it runs after the enemies), while the flame is placed against this frame's screen left.
 * 1-4 f541 and 6-4 f262 (OAM $0200 in the native traces), tests/firebar-contact.test.ts. */
export function nativeFirebarHit(flame:{x:number;y:number},camera:number,marioScreenX:number,feetY:number,bigStanding:boolean){
 const fx=flame.x-4-Math.floor(camera),fy=flame.y-5,top=Math.floor(feetY)-32;
 if(fx<0||fx>=240||fy<0||fy>=240||top<0||top>255)return false; // off screen (wrapped sprite, or Player_Y_HighPos not 1)
 const dx=((marioScreenX+4-fx)<<24)>>24;
 if(Math.abs(dx)>=8)return false;
 return (bigStanding?[0,12,24]:[24]).some(o=>Math.abs(((top+o-fy)<<24)>>24)<8);
}

/** Physical enemy records share one cursor across placed actors and frenzy. */
import catalog from '../data/native-enemy-streams.json';
const streams=new Map(catalog.streams.map(stream=>[stream.pointer,stream.bytes]));
export const nativeEnemyBytes=(pointer:number)=>streams.get(pointer);

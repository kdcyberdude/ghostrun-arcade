import * as THREE from 'three';
/** Non-Three requests participate in the same real asset count as GLBs/textures. */
export async function trackedLoad<T>(url:string,load:()=>Promise<T>):Promise<T>{
 const manager=THREE.DefaultLoadingManager;manager.itemStart(url);
 try{return await load();}
 catch(error){manager.itemError(url);throw error;}
 finally{manager.itemEnd(url);}
}
export const loadJson=<T>(url:string)=>trackedLoad(url,async()=>{
 const response=await fetch(url);
 if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw new Error(`Unable to load ${url} (${response.status})`);
 return await response.json() as T;
});

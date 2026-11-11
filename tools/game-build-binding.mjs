/** Bind browser evidence to an immutable build when the server supplies one. */
export async function gameBuildBinding(page){
 const url=page.url();
 const response=await page.request.get(new URL('/snapshot.json',url).href);
 const type=response.headers()['content-type']??'';
 if(!response.ok()||!type.includes('json'))return {url,snapshot:null,limitation:'Mutable development server; no immutable snapshot manifest supplied.'};
 const snapshot=await response.json();
 if(!snapshot.hashes)throw Error('Invalid snapshot manifest');
 return {url,snapshot};
}

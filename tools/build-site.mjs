// Builds every game in games/* and assembles one static site in dist/.
// The game named by package.json "arcade.rootGame" is served at the site root (existing links keep working);
// every other game is served at /<game>/. Site-wide pages (the film) come from site/.
import {execFileSync} from 'node:child_process';
import {cp,readdir,readFile,rm,access} from 'node:fs/promises';
const {arcade}=JSON.parse(await readFile('package.json','utf8'));
const games=(await readdir('games',{withFileTypes:true})).filter(d=>d.isDirectory()).map(d=>d.name);
if(!games.includes(arcade.rootGame))throw Error(`rootGame "${arcade.rootGame}" is not in games/`);
await rm('dist',{recursive:true,force:true});
for(const game of games){
 execFileSync('npm',['run','build','-w',`games/${game}`],{stdio:'inherit'});
 await cp(`games/${game}/dist`,game===arcade.rootGame?'dist':`dist/${game}`,{recursive:true});
}
if(await access('site').then(()=>true,()=>false))await cp('site','dist',{recursive:true});
console.log(`site: ${games.map(g=>g===arcade.rootGame?`${g} at /`:`${g} at /${g}/`).join(', ')}, plus site/`);

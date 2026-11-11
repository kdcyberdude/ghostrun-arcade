import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import lakituData from '../data/native-lakitu.json';
import type {Area,Enemy,EnemySpec,Level,Tile} from '../src/types.js';

// Native Lakitu (id 17) and Spiny egg (id 18) of 4-1, read-only from the recorded route trace (rows 29094..., slot 1 / slot 0).
// ROUTE_*: Mario x and speed byte per row from Lakitu's first row (x 480), ROUTE_L: Lakitu x every 8th row.
// Mario runs at speed byte 40; Lakitu drifts left, turns 57 px behind Mario (row ~83), catches up and then hovers 62-65 px ahead.
const ROUTE_M=[289,292,294,297,299,302,304,307,309,312,314,317,319,322,324,327,329,332,334,337,339,342,344,347,349,352,354,357,359,362,364,367,369,372,374,377,379,382,384,387,389,392,394,397,399,402,404,407,409,412,414,417,419,422,424,427,429,432,434,437,439,442,444,447,449,452,454,457,459,462,464,467,469,472,474,477,479,482,484,487,489,492,494,497,499,502,504,507,509,512,514,517,519,522,524,527,529,532,534,537,539,542,544,547,549,552,554,557,559,562,564,567,569,572,574,577,579,582,584,587,589,592,594,597,599,602,604,607,609,612,614,617,619,622,624,627,629,632,634,637,639,642,644,647,649,652,654,657,659,662,664,667,669,672,674,677,679,682,684,687,689,692,694,697,699,702,704,707,709,712,714,717,719,722,724,727,729,732,734,737,739,742,744,747,749,752,754,757,759,762,764,767,769,772,774,777,779,782,784,787,789,792,794,797,799,802,804,807,809,812,814,817,819,822,824,827,829,832,834,837,839,842,844,847,849,852,854,857,859,862,864,867,869,872,874,877,879,882,884,887,889,892,894,897,899,902,904,907,909,912,914,917,919,922,924,927,929,932,934,937,939,942,944,947,949,952,954,957,959,962,964,967,969,972,974,977,979,982,984,987,989,992,994,997,999,1002,1004,1007,1009,1012,1014,1017,1019,1022,1024,1027,1029,1032,1034,1037,1039,1042,1044,1047,1049,1052,1054,1057,1059,1062,1064,1067,1069,1072,1074,1077,1079,1082,1084,1087,1089,1092,1094,1097,1099,1102,1104,1107,1109,1112,1114,1117,1119,1122,1124,1127,1129,1132,1134,1137,1139,1142,1144,1147,1149,1152,1154,1157,1159,1162,1164,1167,1169,1172,1174,1177,1179,1182,1184,1187,1189,1192,1194,1197,1199,1202,1204,1207,1209,1212,1214,1217,1219,1222,1224,1227,1229,1232,1234,1237,1239,1242,1244,1247,1249,1252,1254,1257,1259,1262,1264,1267,1269,1272,1274,1277,1279,1282,1284,1287,1289,1292,1294,1297,1299,1302,1304,1307,1309,1312,1314,1317,1319,1322,1324,1327,1329,1332,1334,1337];
const ROUTE_L=[480,477,475,472,470,467,464,459,451,443,438,455,480,505,532,559,586,615,646,677,707,737,765,792,818,844,869,893,914,933,954,972,993,1013,1033,1054,1071,1094,1112,1134,1154,1172,1194,1211,1234,1253,1273,1293,1312,1334,1352,1373,1393];
// Mario stalls at x 1842 for 14 rows (native rows 29720-29734): Lakitu keeps its speed, slows by 1/16 px per frame to a stop 103 px ahead (x 1970), drifts left,
// passes Mario and turns again once 57 px behind him. STUCK_*: rows 29700-29829, STUCK_L every 6th row.
const STUCK_M=[1804,1806,1808,1810,1813,1815,1817,1819,1821,1822,1824,1826,1828,1830,1833,1835,1837,1839,1842,1843,1842,1842,1842,1842,1842,1842,1842,1842,1842,1842,1842,1842,1843,1843,1844,1844,1844,1845,1846,1846,1847,1848,1849,1849,1850,1851,1852,1853,1855,1856,1857,1858,1860,1861,1862,1864,1865,1867,1868,1870,1872,1873,1875,1877,1879,1881,1882,1884,1887,1889,1891,1893,1895,1898,1900,1903,1905,1908,1910,1913,1915,1918,1920,1923,1925,1928,1930,1933,1935,1938,1940,1943,1945,1948,1950,1953,1955,1958,1960,1963,1965,1968,1970,1973,1975,1978,1980,1983,1985,1988,1990,1993,1995,1998,2000,2003,2005,2008,2010,2013,2015,2018,2020,2023,2025,2028,2030,2033,2035,2038];
const STUCK_V=[37,36,36,35,34,33,32,32,31,30,31,32,33,33,34,35,36,37,38,0,0,0,1,1,2,0,0,1,2,3,3,4,5,6,7,7,8,9,10,11,11,12,13,14,15,16,16,17,18,19,20,20,21,22,23,24,24,24,24,25,26,27,28,29,29,30,31,32,33,34,35,36,37,37,38,39,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40];
const STUCK_L=[1868,1881,1891,1906,1922,1936,1947,1956,1963,1968,1970,1970,1968,1966,1963,1957,1950,1944,1940,1944,1963,1982];
// An egg of 4-1 (row 29479, x 1312): native y every 6th frame after the throw; it lands (y 184) 98 frames after the throw. Eggs of one level show six
// variants of this arc, up to 3 px apart (a hidden y fraction), hence the 3 px tolerance.
const EGG_Y=[32,16,4,-3,-5,-4,3,14,29,48,67,86,106,124,144,163,182];

function fixture(enemy:Partial<EnemySpec>={},spawnX=289){
 const tiles:Tile[]=[];for(let x=0;x<256;x++)tiles.push([x,13,84]);
 const area:Area={id:'main',width:4096,palette:0,theme:'ground',tiles,enemies:[{kind:'lakitu',x:480,y:64,palette:'0f-1a-30-27',direction:-1,...enemy}],spawn:[spawnX,208],evidence:'Synthetic Lakitu fixture'};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim;
}
// Drives only the Lakitu controller with the native Mario x / speed byte of each row (the controller reads the player, not the camera).
function driveLakitu(sim:Simulation,mario:number[],speed:number[],lakitu:Enemy){
 const xs:number[]=[];
 for(let k=0;k<mario.length;k++){sim.player.x=mario[k];sim.player.vx=speed[k]/16;lakitu.age=lakitu.age+1;(sim as any).updateNativeLakitu(lakitu);xs.push(lakitu.x);}
 return xs;
}

test('Lakitu follows the native 4-1 route: drift left, turn 57 px behind Mario, then hover 62-65 px ahead (row-by-row positions every 8th row)',()=>{
 const sim=fixture();const lakitu=sim.enemies[0];lakitu.active=true;lakitu.age=0;
 const xs=driveLakitu(sim,ROUTE_M,ROUTE_M.map(()=>40),lakitu);
 ROUTE_L.forEach((native,i)=>{const k=i*8;assert.ok(Math.abs(xs[k]-native)<=6,`row ${k}: remake ${xs[k].toFixed(1)} native ${native}`);});
});

test('Lakitu coasts to a stop 100 px ahead of a stalled Mario, drifts back, and chases again 57 px behind him',()=>{
 const sim=fixture();const lakitu=sim.enemies[0];lakitu.active=true;lakitu.age=1000;lakitu.x=STUCK_L[0];lakitu.lak={mode:'chase',s:35};
 const xs=driveLakitu(sim,STUCK_M,STUCK_V,lakitu);
 STUCK_L.forEach((native,i)=>{const k=i*6;assert.ok(Math.abs(xs[k]-native)<=8,`row ${k}: remake ${xs[k].toFixed(1)} native ${native}`);});
 const out=xs.slice(0,90),peak=Math.max(...out);assert.ok(Math.abs(peak-1970)<=6,`peak ${peak}`);assert.ok(Math.abs(out.indexOf(peak)-63)<=10,`peak row ${out.indexOf(peak)}`);
 assert.equal(lakitu.lak!.mode,'chase');
});

test('a Lakitu throws an egg on its second active frame and then every 128 frames, at its own x, and stops when it flees',()=>{
 const sim=fixture({x:160},40);
 const born:number[]=[];let eggs=0;
 for(let f=1;f<=2+128*2+4;f++){sim.step([],1);const n=sim.enemies.filter(e=>e.egg).length;if(n>eggs){born.push(f);eggs=n;}}
 assert.deepEqual(born,[2,130,258]);
 const egg=sim.enemies.filter(e=>e.egg)[2],lakitu=sim.enemies.find(e=>e.kind==='lakitu')!;
 assert.ok(Math.abs(egg.originX-lakitu.x)<5,`egg x ${egg.originX} lakitu ${lakitu.x}`);
 lakitu.fleeX=0;const before=sim.enemies.filter(e=>e.egg).length,x0=lakitu.x;sim.step([],200);
 assert.equal(sim.enemies.filter(e=>e.egg).length,before);assert.ok(lakitu.x<x0-150||lakitu.dead);
});

test('a Lakitu egg rises 37 px, falls under gravity 1/8 to the native y track and lands about 98 frames after the throw',()=>{
 const sim=fixture({x:160},40);sim.step([],2);
 const egg=sim.enemies.find(e=>e.egg)!;assert.equal(egg.motion,'falling');const x=egg.x;
 let k=0;
 for(const y of EGG_Y.slice(0,16)){sim.step([],6*(k===0?0:1));assert.ok(Math.abs(egg.y-24-y)<=3,`k ${k*6}: y ${egg.y-24} vs ${y}`);assert.equal(egg.x,x);k++;}
 sim.step([],4);assert.equal(egg.motion,'falling');sim.step([],6); // k 94 still falling, k 100 landed (native: row 98)
 assert.equal(egg.motion,undefined);assert.equal(egg.y,208);assert.equal(egg.vx,-0.5); // lands, then walks toward Mario (x 40, left of the egg)
});

test('native Lakitu appearance x and the Mario x at which it starts to flee are applied to 4-1, 6-1 and 8-2',()=>{
 for(const entry of lakituData.levels){
  const area=observedLevels().find(l=>l.id===entry.level)!.areas.find(a=>a.id===entry.area)!;
  const lakitu=area.enemies.find(e=>e.kind==='lakitu')!;
  assert.equal(lakitu.x,entry.x);assert.equal(lakitu.fleeX,entry.fleeX);
 }
 assert.deepEqual(lakituData.levels.map(l=>[l.level,l.x,l.fleeX]),[['4-1',480,3318],['6-1',512,2708],['8-2',336,760]]);
});

'use strict';
const fs=require('node:fs');
function edit(file,replacements){let s=fs.readFileSync(file,'utf8');for(const [from,to] of replacements){if(s.includes(to))continue;if(!s.includes(from))throw Error('Missing signature: '+file+' '+from.slice(0,60));s=s.replace(from,to);}const imp="import { getMenagerieBonus, hasMenagerieUnlock } from '@parsers/world-7/menagerie';\n";if(!s.includes(imp))s=imp+s;fs.writeFileSync(file,s);}
const p='vendor/idleon-toolbox/parsers/';
edit(p+'world-4/cooking.ts',[
 ['const expRate = 2','const expRate = 2 * (1 + getMenagerieBonus(account, 21) / 100)'],
 ["{ name: 'Base', value: 2 },","{ name: 'Base', value: 2 },\n          { name: 'Menagerie', value: 1 + getMenagerieBonus(account, 21) / 100 },"],
 ['const mealSpeed = 10','const mealSpeed = 10 * (1 + getMenagerieBonus(account, 4) / 100)'],
 ['{ name: "Base", value: 10 },','{ name: "Base", value: 10 },\n            { name: "Menagerie", value: 1 + getMenagerieBonus(account, 4) / 100 },'],
 ['return DEFAULT_MEAL_MAX_LEVEL','return DEFAULT_MEAL_MAX_LEVEL + (hasMenagerieUnlock(account, 20) ? 10 : 0)']
]);
edit(p+'world-7/research.ts',[
 ['const value = jellyFactor * additiveFactor','const value = (1 + getMenagerieBonus(account, 3) / 100) * jellyFactor * additiveFactor'],
 ["{ name: 'Jelly rewards', value: jellyFactor }","{ name: 'Menagerie', value: 1 + getMenagerieBonus(account, 3) / 100 },\n          { name: 'Jelly rewards', value: jellyFactor }"]
]);
edit(p+'world-7/spelunking.ts',[
 ['const powerMulti = (1 + getJellyReward','const powerMulti = (1 + getMenagerieBonus(account, 22) / 100) * (1 + getJellyReward'],
 ['{ name: "Learning the POW", value: basePower },','{ name: "Learning the POW", value: basePower },\n            { name: "Menagerie", value: getMenagerieBonus(account, 22) },']
]);
edit(p+'character.ts',[
 ['const value = workbenchBonus','const value = (1 + getMenagerieBonus(account, 23) / 100) * workbenchBonus'],
 ['{ name: "Workbench (Siege Breaker)", value: workbenchBonus },','{ name: "Menagerie", value: 1 + getMenagerieBonus(account, 23) / 100 },\n            { name: "Workbench (Siege Breaker)", value: workbenchBonus },'],
 ['final *= (1 + (tesseractMapBonus || 0) / 100)','final *= (1 + getMenagerieBonus(account, 24) / 100) * (1 + (tesseractMapBonus || 0) / 100)']
]);
console.log('Menagerie calculation factors integrated.');

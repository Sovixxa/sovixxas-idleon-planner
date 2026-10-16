'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={console:{log(){},warn(){},error(){}},structuredClone};c.self=c;c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),c);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw),M=c.PrayerMath;
const parse=data=>M.parseData(structuredClone(data),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const base=parse(raw.data),save=structuredClone(raw.data),state=Array.from({length:7},()=>Array(40).fill(0));
for(const i of [3,4,19,21,22,23,24])state[3][i]=2;state[2][20]=1;save.Menagerie=JSON.stringify(state);const updated=parse(save);
const catalogs={window:{}};vm.runInNewContext(fs.readFileSync('world7-data.js','utf8'),catalogs);
const qty=i=>Number(catalogs.window.WORLD7_CATALOG.Research[58][i])*2,near=(a,b)=>assert(Math.abs(a-b)<=Math.abs(b)*1e-9,`${a} != ${b}`);
const char=1;
for(const [id,get] of [
 [23,p=>M.getClassExpMulti(p.characters[char],p.account,p.characters).value],
 [24,p=>M.getDropRate(p.characters[char],p.account,p.characters).dropRate],
 [3,p=>p.account.research.researchEXPrateTOT],
 [21,p=>p.account.cooking.cookingMastery.expRate]
]){const a=get(base),b=get(updated);assert(Number.isFinite(a)&&a>0,`baseline ${id}`);near(b/a,1+qty(id)/100);}
assert.equal(updated.account.cooking.mealMaxLevel,base.account.cooking.mealMaxLevel+10);
const read=v=>typeof v==='string'?JSON.parse(v):v;
const speed=p=>M.parseKitchens(read(raw.data.Cooking),read(raw.data.Atoms),p.characters,p.account,{characterIndex:char})[0].mealSpeed;
near(speed(updated)/speed(base),1+qty(4)/100);
assert.equal(JSON.stringify(raw),before);
console.log('Menagerie: research, cooking, mastery, class EXP, drop rate, meal cap and immutable save integration pass.');

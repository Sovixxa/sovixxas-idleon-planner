'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),C=require('./cooking');
const c={console:{log(){},warn(){},error(){}},structuredClone};c.window=c;c.self=c;vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));let result;c.postMessage=x=>result=structuredClone(x);c.importScripts('cooking-worker.js');
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw);c.onmessage({data:raw});assert(!result.error,result.error);assert.equal(JSON.stringify(raw),before);
assert.equal(result.values.length,raw.charNames.length);assert(result.values.every(x=>Number.isFinite(x.speed)&&x.speed>0&&x.kitchens===10));
const cook=result.values.find(x=>x.ladleBonus>0);assert(cook);assert(Math.abs(cook.ladleBonus-100*659/(659+80))<1e-9,'Overflowing Ladle uses effective talent level');
const model=C.decode(raw.data,raw),r=C.estimate({level:model.levels[0],stock:model.stock[0],progress:model.progress[0],requirement:10,discount:model.discount,companion:model.companion,speed:cook.speed,ladleBonus:cook.ladleBonus});assert(Number.isFinite(r.ladles)&&r.ladles>0);assert.equal(r.ladles,Math.ceil(r.hours/(1+cook.ladleBonus/100)));
const e={level:0,stock:2,progress:5,requirement:10,discount:1,companion:0,speed:25,ladleBonus:50};assert.equal(C.estimate(e).ladles,2);assert.equal(C.estimate({...e,stock:10}).ladles,0);assert.equal(C.estimate({...e,speed:0}).ladles,null);

const secondary=result.scenarios.find(s=>s.id==='secondary');assert(secondary,'Secondary talent records must be read even when saved as objects');
assert.equal(secondary.blood[0].level,305);assert.equal(secondary.switches[0].before,1);assert.equal(secondary.switches[0].preset,2);
const better=secondary.values.find(c=>c.id===cook.id);
assert.equal(C.estimate({level:model.levels[0],stock:model.stock[0],progress:model.progress[0],requirement:10,discount:model.discount,companion:model.companion,speed:better.speed,ladleBonus:better.ladleBonus}).ladles,8);
const near=(a,b)=>assert(Math.abs(a-b)/Math.max(1,Math.abs(b))<1e-10,`${a} != ${b}`);
for(const scenario of result.scenarios){
 for(const character of scenario.values)near(character.sources.reduce((p,s)=>p*s.value,1),character.speeds[0]);
 const sources=scenario.values[1].sources,source=name=>sources.find(s=>s.name===name).value;
 near(source('Blood Marrow (Talent)'),1+Math.pow(Math.min(1.012,1+(2.1*scenario.blood[0].level/(scenario.blood[0].level+220))/100),scenario.totalMealLevels)/100);
 const d=scenario.diamond;assert(d.prisma);near(d.perMeal,(1+.3*d.level/(d.level+13))*d.prismaMulti);near(source('Diamond Chef (Bubble)'),Math.pow(d.perMeal,d.meals));
 assert(source('Summoning rewards')>1);assert(source('Crop Depot')>1);assert(source('Enhancement Eclipse')>1);assert(source('Button')>=1);
 near(source('Meals (Cooking Speed)'),1+scenario.mealBonuses.filter(m=>m.stat==='Mcook').reduce((sum,m)=>sum+m.bonus,0)/100);
 assert(scenario.mealBonuses.some(m=>m.stat==='KitchenEff'));assert(scenario.mealBonuses.some(m=>m.stat==='zMealFarm'));
}
// Independently vary contributors: Prisma's Jelly unlock and each cooking dependency must affect the result.
const M=c.PrayerMath,parsed=M.parseData(structuredClone(raw.data),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const account=parsed.account,read=v=>typeof v==='string'?JSON.parse(v):v;
const baseline=M.parseKitchens(read(raw.data.Cooking),read(raw.data.Atoms),parsed.characters,account,{characterIndex:1})[0].mealSpeed;
const without=(change)=>{const copy=JSON.parse(JSON.stringify(account));change(copy);return M.parseKitchens(read(raw.data.Cooking),read(raw.data.Atoms),parsed.characters,copy,{characterIndex:1})[0].mealSpeed;};
assert(without(a=>a.summoning.winnerBonuses.find(x=>x.bonus==='<x Cooking SPD').value=0)<baseline);
assert(without(a=>a.farming.cropDepot.cookingSpeed.value=1)<baseline);
assert(without(a=>a.cooking.meals.forEach(m=>{if(m.stat==='Mcook')m.level=0;}))<baseline);
assert(without(a=>a.alchemy.prismaBubbles='')<baseline);
const below=JSON.parse(JSON.stringify(account));below.research.jellyObstruction=36;const above=structuredClone(below);above.research.jellyObstruction=37;
near(M.getPrismaMulti(above).value-M.getPrismaMulti(below).value,.01);
assert.equal(M.getPrismaMulti(above).breakdown.categories[0].sources.find(x=>x.name==='Jelly Operator').value,1);
assert.equal(JSON.stringify(raw),before,'Preset simulation must not mutate the imported save');
console.log('Secondary preset: Blood Marrow 1 -> 305 gives 8 ladles; Diamond Chef/Prisma exponent, Summoning, crops, meals and every kitchen multiplier verified.');
c.onmessage({data:{}});assert(result.error);console.log('Cooking save calculation passed: all characters, kitchen speed, effective ladle talent, rounding, ready stock, missing save and no mutation.');console.log('Example:',cook.name,'speed',cook.speed,'bonus',cook.ladleBonus,'first meal ladles',r.ladles);

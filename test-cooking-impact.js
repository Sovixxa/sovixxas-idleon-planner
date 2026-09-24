'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={console:{log(){},warn(){},error(){}},structuredClone};c.self=c;c.window=c;vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c));let result;c.postMessage=r=>result=structuredClone(r);c.importScripts('cooking-impact-worker.js');
const raw=JSON.parse(fs.readFileSync('../example json.txt')),snapshot=JSON.stringify(raw);
const parse=save=>c.PrayerMath.parseData(structuredClone(save),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const baseline=parse(raw.data),near=(a,b)=>assert(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const points={64:10,72:9,73:9,6:1,27:2,41:4,60:3};
c.onmessage({data:{raw,scenario:'current',character:1,points,ids:[64,72,73,6,41,60],key:'main'}});assert(!result.error,result.error);assert.equal(result.key,'main');
for(const [id,r] of Object.entries(result.impacts))assert(!r.unavailable,`${id}: ${r.reason}`);
const save=structuredClone(raw.data),cm=JSON.parse(save.CookMaster);for(const [id,p] of Object.entries(points))cm[0][id]=p;save.CookMaster=JSON.stringify(cm);const edited=parse(save);
near(result.impacts[72].test,edited.account.research.researchEXPrateTOT);
near(result.impacts[73].test,edited.account.minehead.currencyGain);
near(result.impacts[6].test,c.PrayerMath.getAllEff(edited.characters[1],edited.characters,edited.account));
near(result.impacts[6].test,result.impacts[41].test);assert.notEqual(result.impacts[6].next,result.impacts[41].next,'Different meal contributions affect the same efficiency pool differently');
assert.equal(JSON.stringify(raw),snapshot,'Original save must be immutable');
const contexts=new Set(['PetDmg','Critter','SplkExp']);let supported=0;
for(const stat of new Set(baseline.account.cooking.meals.map(m=>m.stat))){
 if(contexts.has(stat)){assert.throws(()=>c.CookingImpactModel.metric(baseline,1,stat,raw.data));continue;}
 const r=c.CookingImpactModel.metric(baseline,1,stat,raw.data);assert(Number.isFinite(r.value),stat);assert(r.label);supported++;
}
assert(supported>=40);assert.equal(c.CookingImpactModel.metric(baseline,1,'Sprow',raw.data).value,10,'Prowess cap respected');
// Gaming EXP must use its own meal, not Spaghetti's breeding EXP.
const gaming=c.PrayerMath.getSkillExpMulti('gaming',baseline.characters[1],baseline.characters,baseline.account);
near(gaming.breakdown.find(s=>s.name==='Meal').value,c.PrayerMath.getMealsBonusByEffectOrStat(baseline.account,null,'GamingExp')/100);
c.onmessage({data:{scenario:'secondary',character:1,points:{},ids:[13,34,51],key:'secondary'}});assert(!result.error,result.error);assert(result.impacts[13].test>1e160,'Secondary Blood Marrow must be applied');assert(result.impacts[34].lower,'Checkout time identifies lower as better');assert(result.impacts[51].next===result.impacts[51].test,'Sailing minimum time cap blocks an apparent gain');
c.onmessage({data:{scenario:'current',character:1,points:{},ids:[64],key:'reset'}});near(result.impacts[64].relative,0);
console.log(`Mastery account impacts: ${supported} effect types, full-export parity, pooled edits, reset, secondary preset, game caps, context errors and immutability pass.`);

'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={console:{log(){},warn(){},error(){},debug(){}},structuredClone,localStorage:{getItem(){return null;}}};c.window=c;vm.createContext(c);
for(const f of ['prayer-math-engine.js','beanstalk-engine.js','world7-data.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw),read=v=>typeof v==='string'?JSON.parse(v):v;
const parse=r=>c.PrayerMath.parseData(structuredClone(r.data),r.charNames,r.companion,r.guildData,r.serverVars||{},r.accountCreateTime,r.tournament);
const changed=structuredClone(raw),m=Array.from({length:7},()=>Array(40).fill(0));m[0][2]=20;m[0][0]=10000;
for(const i of [1,7,9,11,13,16,18,20])m[3][i]=2;
changed.data.Menagerie=JSON.stringify(m);const sp=read(changed.data.Spelunk);sp[49]=Array(37).fill(0);sp[49][0]=2;sp[50]=[0];changed.data.Spelunk=JSON.stringify(sp);
const base=parse(raw),next=parse(changed),q=i=>2*Number(c.WORLD7_CATALOG.Research[58][i]),multi=i=>1+q(i)/100,near=(a,b,msg)=>assert(Number.isFinite(a)&&Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-9,`${msg}: ${a} != ${b}`);
const breedingSave=structuredClone(changed),breeding=read(breedingSave.data.Breeding);breeding[22][0]=1e20;breedingSave.data.Breeding=JSON.stringify(breeding);
assert.equal(parse(breedingSave).account.breeding.pets[0][0].shinyLevel,20);
const unlocked=read(breedingSave.data.Menagerie);unlocked[2][11]=1;breedingSave.data.Menagerie=JSON.stringify(unlocked);
const shiny=parse(breedingSave).account.breeding.pets[0][0];assert.equal(shiny.shinyLevel,30);assert.equal(shiny.maxShinyLevel,30);
for(const [key,id] of [['owl',16],['kangaroo',18],['bubba',20]]){
 const a=base.account[key]?.upgrades,b=next.account[key]?.upgrades;if(!a||!b)throw Error('Missing '+key);
 near(b[0].cost,a[0].cost/multi(id),key+' first cost');near(b[1].cost,a[1].cost,key+' other cost');
}
near(next.account.farming.exoticMarket[0].value,base.account.farming.exoticMarket[0].value*2,'organic label');
for(const [key,id] of [['orion',16],['poppy',18],['bubba',20]]){
 const a=c.BeanValueEngine.systems(raw).get(key),costs=[a.getUpgradeCost(0),a.getUpgradeCost(1)],b=c.BeanValueEngine.systems(changed).get(key);
 near(b.getUpgradeCost(0),costs[0]/multi(id),key+' legacy cost');near(b.getUpgradeCost(1),costs[1],key+' legacy other cost');
}
const legacyBase=c.BeanValueEngine.systems(raw),palette=legacyBase.get('gaming').getPaletteBonus(0),organic=legacyBase.get('farming').getExoticMarketBonusValue(0),forge=legacyBase.get('forge').slots[0].getSpeed(100),loot=legacyBase.get('sailing').boats[0].getLootValue(),legacy=c.BeanValueEngine.systems(changed);
near(legacy.get('forge').slots[0].getSpeed(100),forge*multi(11),'legacy forge');
near(legacy.get('sailing').boats[0].getLootValue(),loot*multi(9),'legacy sailing loot');
near(legacy.get('gaming').getPaletteBonus(0),palette*4,'black stars');
near(legacy.get('farming').getExoticMarketBonusValue(0),organic*2,'legacy organic label');
const legacyShiny=c.BeanValueEngine.systems(breedingSave).get('breeding').basePets.find(p=>p.data.world===0&&p.indexInWorld===0);
assert.equal(legacyShiny.shinyLevel,30);
assert(c.BeanValueEngine.systems(raw).get('breeding').basePets.every(p=>p.shinyLevel<=20),'Old saves reset the expanded cap');
const l=c.PrayerMath.getMenagerieAnalysis(changed,next.account);assert(l.complete);assert(l.rate>0);assert(l.nextLumiBoost.gain>0);near(l.rate,10*l.factors.reduce((n,x)=>n*x.value,1)*(1+l.additive.reduce((n,x)=>n+x.value,0)/100),'Lumi breakdown');
const missing=structuredClone(changed);delete missing.data.ArcadeUpg;assert.equal(c.PrayerMath.getMenagerieAnalysis(missing,next.account).rate,null);
assert.equal(JSON.stringify(raw),before);
console.log('Expanded Menagerie: older clickers, legacy dependency hooks, black stars, organic labels, Lumi breakdown, partial saves and immutability pass.');

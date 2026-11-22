'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {handler}=require('./client-source-utils'),Clam=require('./clamworks-optimizer');
const c={console,structuredClone,setTimeout};vm.createContext(c);
vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),c);
const M=c.PrayerMath,raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
const parsed=M.parseData(raw.data,raw.charNames,raw.companion,raw.guildData,raw.serverVars,raw.accountCreateTime,raw.tournament);
const ch={...parsed.characters[3],mapIndex:306,targetMonster:'w7a6'};
const source=handler(fs.readFileSync('../audit/live-N-nov15-hotfix-check.js','utf8'),'_customBlock_DamageDealed');
const expression=source.match(/Math\.min\(100,p\._customBlock_Labb\("TotalGreenSigils",\s*"0",0,0\)\*m\._customBlock_ResearchStuff\("Grid_Bonus",127,0\)\)\/100/)[0];
const near=(a,b)=>assert(Math.abs(a-b)<Math.max(1,Math.abs(b))*1e-10,`${a} != ${b}`);
let checks=0;
for(const reliquarium of [false,true])for(const count of [0,1,12,24])for(const grid of [0,1,5,20]){
 const account=JSON.parse(JSON.stringify(parsed.account));
 account.hole.reliquarium=reliquarium;
 account.alchemy.p2w.totalEclecticSigils=count;
 account.research.gridSquares[127]={bonuses:[0]};
 const before=M.getMaxDamage(ch,parsed.characters,account);
 account.research.gridSquares[127]={bonuses:[grid]};
 const after=M.getMaxDamage(ch,parsed.characters,account);
 const bonus=vm.runInNewContext(expression,{p:{_customBlock_Labb:()=>count},m:{_customBlock_ResearchStuff:()=>grid}});
 const exponent=reliquarium?4/(5+Number(account.accountOptions[473]||0)):1;
 near(after.maxDamage,before.maxDamage*(1+bonus)**exponent);
 assert.equal(after.damageBreakdown.categories[3].subSections[0].sources.find(s=>s.name==='Green Sigil Research').value,bonus*100);
 if(bonus>0){
  // Move a measured character just below a real Clamworks tier threshold.
  const threshold=25e16,scale=threshold/(before.maxDamage*1.001);
  const loot={damage:before.maxDamage*scale,clamworksDamage:before.maxDamage*scale,base:100,perTier:[0,0,0,0,0,0,50]};
  assert.equal(Clam.farmerMultikill({loot},0),127);
  loot.clamworksDamage=after.maxDamage*scale;
  assert.equal(Clam.farmerMultikill({loot},0),175);
 }
 checks++;
}
console.log(`Clamworks damage: ${checks} native green-sigil comparisons, cap, Reliquarium ordering and tier crossings passed.`);
const thingies=vm.runInNewContext('('+handler(fs.readFileSync('../audit/live-N-nov15-hotfix-check.js','utf8'),'_customBlock_Thingies')+')',{
 a:{engine:{getGameAttribute:()=>coralOptions}},c:{asNumber:Number}
});
const coralOptions=[];
const coralExpression=source.match(/Math\.pow\(1\+m\._customBlock_Thingies\("CoralKidUpgBonus",11,0\)\/100,Math\.max\(0,c.asNumber\(a.engine.getGameAttribute\("Divinity"\)\[25\]\)-35\)\)/)[0];
for(const level of [0,1,50,100])for(const ranks of [0,35,36,60,100]){
 const account=JSON.parse(JSON.stringify(parsed.account));
 account.accountOptions[621]=0;account.divinity.unlockedDeities=ranks;
 const before=M.getMaxDamage(ch,parsed.characters,account);
 account.accountOptions[621]=level;coralOptions[621]=level;
 const bonus=thingies('CoralKidUpgBonus',11,0);
 const multiplier=vm.runInNewContext(coralExpression,{m:{_customBlock_Thingies:()=>bonus},a:{engine:{getGameAttribute:()=>Array.from({length:26},(_,i)=>i===25?ranks:0)}},c:{asNumber:Number}});
 const after=M.getMaxDamage(ch,parsed.characters,account);
 const entry=after.damageBreakdown.categories[3].subSections[0].sources.find(s=>s.name==='Coral Kid (God Ranks)');
 near(entry.value,(multiplier-1)*100);
 if(multiplier===1)near(after.maxDamage,before.maxDamage);
 else {
  assert(after.maxDamage>before.maxDamage,'Coral Kid must affect damage');
  assert(after.maxDamage/before.maxDamage<multiplier,'Coral Kid must be subject to damage softcaps');
 }
}
console.log('Coral Kid: 20 native upgrade/multiplier comparisons, rank-35 gate and softcap placement passed.');
for(const file of ['connected-primary-stats.js','drop-rate-model.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const beforeRaw=JSON.stringify(raw),fresh=c.DropRateModel.calculate(raw),stale=JSON.parse(beforeRaw);
for(const key of Object.keys(stale.data).filter(k=>/^PVStatList_/.test(k))){
 const stats=typeof stale.data[key]==='string'?JSON.parse(stale.data[key]):stale.data[key];
 for(let i=0;i<4;i++)stats[i]=1;
 stale.data[key]=stats;
}
const staleBefore=JSON.stringify(stale),staleResult=c.DropRateModel.calculate(stale),state=Clam.decode(raw);
for(let i=0;i<fresh.characters.length;i++){
 assert(!fresh.characters[i].loot.clamworksError,fresh.characters[i].loot.clamworksError);
 near(fresh.characters[i].loot.clamworksDamage,staleResult.characters[i].loot.clamworksDamage);
 assert.equal(Clam.farmerMultikill(fresh.characters[i],state.promotion,state.scurge[2]),Clam.farmerMultikill(staleResult.characters[i],state.promotion,state.scurge[2]));
}
assert.equal(JSON.stringify(raw),beforeRaw);assert.equal(JSON.stringify(stale),staleBefore);
const failed={loot:{damage:1e30,base:100,perTier:[0,0,0,0,0,0,50],clamworksError:'Could not rebuild primary stats'}};
assert.equal(Clam.farmerMultikill(failed,0),null,'Never silently fall back to cached stats when the rebuild fails');
console.log('Clamworks save pipeline: stale cached stats leave every farmer unchanged; exports remain immutable; failed rebuilds do not fall back.');

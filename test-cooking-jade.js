'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={console:{log(){},warn(){},error(){}},structuredClone};c.self=c;c.window=c;vm.createContext(c);for(const f of ['prayer-math-engine.js','cooking-impact-model.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const raw=JSON.parse(fs.readFileSync('../example json.txt')),data=c.PrayerMath.parseData(structuredClone(raw.data),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament),a=data.account,ch=data.characters[1],M=c.PrayerMath;
const near=(x,y)=>assert(Math.abs(x-y)<1e-9*Math.max(1,Math.abs(y)),`${x} != ${y}`);
const before=JSON.stringify(data),b=M.getJadeRateBreakdown(ch,a);
// Independent client constants: NinjaInfo[10][10]=15M, [11]=60M; mastery pass only runs above zero.
assert.equal(a.accountOptions[231],7);near(b.factors['Floor and selected Sneaking mastery'],.1*15000000*Math.pow(60000000,7));
assert(b.value>1e94&&b.value<1e98,'Late mastery must not be previewed as e26');
near(b.value,1.005359536059357e96);
const lower=JSON.parse(JSON.stringify(a));lower.accountOptions[231]=6;near(b.value/M.getJadeRate(ch,lower),60000000);
lower.accountOptions[231]=0;near(b.value/M.getJadeRate(ch,lower),.1*Math.pow(60000000,7));
const gem=JSON.parse(JSON.stringify(a));gem.sneaking.gemStones[1].bonus=0;near(b.value/M.getJadeRate(ch,gem),1+a.sneaking.gemStones[1].bonus/100);
const env=JSON.parse(JSON.stringify(a));env.sneaking.inventory=env.sneaking.inventory.filter(i=>i.name!=='Gold_Envelope');near(b.value/M.getJadeRate(ch,env),b.factors['Gold Envelope']);
// Belts share an additive bracket and their individual symbol amplification is applied before summation.
const belts=JSON.parse(JSON.stringify(a));belts.sneaking.players[ch.playerId].equipment[2]={subType:14,rawValue:100,symbolBonus:50};belts.sneaking.players[ch.playerId].equipment[3]={subType:19,rawValue:200,symbolBonus:100};
const scroll=belts.sneaking.inventory.find(i=>i.name==='Gold_Scroll').value;
near(M.getJadeRateBreakdown(ch,belts).factors['Green and Black Belts'],1+(100*1.5+200*2)*(1+scroll/100)/100);
const simulated=JSON.parse(JSON.stringify(a)),meal=simulated.cooking.meals.find(m=>m.stat==='zJade');meal.cookingMasteryNode={level:1,multi:1+1/6};
const updated=M.getJadeRateBreakdown(ch,simulated);near(updated.value/b.value,updated.factors['Vial, meal and card']/b.factors['Vial, meal and card']);
assert.equal(JSON.stringify(data),before);assert(c.CookingImpactModel.metric(data,1,'zJade',raw.data).note.includes('Sneaking Mastery 7'));
console.log('Jade: client mastery floor scale, missing account multipliers, shared/symbol belt formula, isolated meal gain and immutable save pass.');

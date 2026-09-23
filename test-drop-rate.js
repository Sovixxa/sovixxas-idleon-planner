'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={console,structuredClone,setTimeout};vm.createContext(context);
for(const file of ['prayer-math-engine.js','drop-rate-model.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const M=context.PrayerMath,D=context.DropRateModel,raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(raw);
const result=D.calculate(raw);assert.equal(JSON.stringify(raw),original,'Never mutate the imported save');
assert.equal(result.characters.length,raw.charNames.length);
for(const ch of result.characters){assert(!ch.error,ch.error);assert(ch.rows.length>60);assert(Math.abs(ch.rows.at(-1).running-ch.normal)<ch.normal*1e-10);assert.equal(ch.missing.length,0);}
assert.equal(D.calculate({}).characters.length,0);
const p=M.parseData(raw.data,raw.charNames,raw.companion,raw.guildData,raw.serverVars,raw.accountCreateTime,raw.tournament),ch=p.characters[3],account=p.account;
const rate=a=>M.getDropRate(ch,a,p.characters);
const chanceGear=M.getDropRate({...ch,tools:[...ch.tools,{UQ1txt:'%_DROP_CHANCE',UQ1val:100}]},account,p.characters);
assert.equal(chanceGear.pools.additive-rate(account).pools.additive,100,'DROP_CHANCE gear joins the additive pool');
assert.doesNotThrow(()=>D.ledger(chanceGear));
// Royal Guardian's personal Family Guy boost must not leak onto other characters.
const familyValue=result=>result.breakdown.categories[1].sources.find(s=>s.name==='Royal Guardian family').value;
const noFamilyGuy={...ch,flatTalents:ch.flatTalents.map(t=>t.name==='THE_FAMILY_GUY'?{...t,level:0}:t)};
const familyBase=familyValue(M.getDropRate(noFamilyGuy,account,[noFamilyGuy]));
const familyBoost=familyValue(M.getDropRate(ch,account,[ch]));
assert(familyBase>0);
assert(Math.abs(familyBoost/familyBase-(1+M.getTalentBonus(ch.flatTalents,'THE_FAMILY_GUY')/100))<1e-12);
const other={...p.characters[0],playerId:999};
assert.equal(familyValue(M.getDropRate(other,account,[ch,other])),familyBase);
const higher={...noFamilyGuy,playerId:998,level:ch.level+1};
assert.equal(familyValue(M.getDropRate(ch,account,[ch,higher])),familyBoost,'A later raw candidate must beat the already-amplified provider');
const before=rate({...account,research:{...account.research,jellyObstruction:14}}),after=rate({...account,research:{...account.research,jellyObstruction:15}});
assert.equal(before.jellyDropRateBonus,0);assert.equal(after.jellyDropRateBonus,5);
assert(Math.abs(after.dropRate/before.dropRate-(100+before.sushiDropRateBonus+5)/(100+before.sushiDropRateBonus))<1e-12,'Jelly shares the Sushi pool');
const pets=account.companions.list.map((p,i)=>i===160?{...p,acquired:true,bonus:2}:p);
const stronger=rate({...account,companions:{...account.companions,list:pets}});
const baseline=rate({...account,companions:{...account.companions,list:pets.map((p,i)=>i===160?{...p,bonus:1}:p)}});
assert(Math.abs(stronger.dropRate/baseline.dropRate-2/1.5)<1e-12,'Glunko is not capped at 1.5');
const coveRaw=JSON.parse(original);coveRaw.data.CurrentMap_3=216;const holes=typeof coveRaw.data.Holes==='string'?JSON.parse(coveRaw.data.Holes):coveRaw.data.Holes;holes[0][3]=17;coveRaw.data.Holes=holes;
const cove=D.calculate(coveRaw).characters[3];assert(cove.cove);assert.equal(cove.total,account.hole.caverns.crystalGlunkoCove.dropRate);
// Execute the installed client's golden-food function, not a rewritten copy.
if(fs.existsSync('../audit/N.js')){
 const source=fs.readFileSync('../audit/N.js','utf8'),start=source.indexOf('_customBlock_GoldFoodBonuses=function')+'_customBlock_GoldFoodBonuses='.length,end=source.indexOf(',q._customBlock_MonsterDamage=',start);
 assert(start>50&&end>start);
 const cake=ch.food.find(f=>f.Effect==='DropRatez'),foodMulti=M.getGoldenFoodMulti(ch,account,p.characters).value;
 const attrs={DNSM:{h:{FamBonusQTYs:{h:{66:foodMulti}},AlchBubbles:{h:{GFoodz:0}},StarSigns:{h:{69:0}},CalcTalentMAP:{h:{209:0}}}},FoodSlotsOwned:1,EquipmentOrder:[[],[],['cake']],EquipmentQuantity:[[],[],[cake.amount]],ItemDefinitionsGET:{h:{cake:{h:cake}}},Ninja:Array.from({length:105},()=>[]),CustomLists:{h:{NinjaInfo:Array.from({length:30},()=>[])}}};
 attrs.Ninja[104]=[3];attrs.CustomLists.h.NinjaInfo[29]=['unused','unused','cake'];
 const zeros=overrides=>new Proxy(overrides,{get:(o,k)=>o[k]||(()=>0)});
 const game={Math,c:{asNumber:v=>Number(v)||0},h:{string:String},a:{engine:{getGameAttribute:k=>attrs[k]}},k:zeros({_customBlock_getLOG:v=>Math.log(Math.max(v,1))/2.30259}),x:zeros({}),w:zeros({}),p:zeros({}),m:zeros({_customBlock_Ninja:key=>key==='EmporiumBonus'?1:0}),q:zeros({})};
 vm.createContext(game);vm.runInContext('gold='+source.slice(start,end),game);
 const expected=game.gold('DropRatez'),actual=M.getGoldenFoodBonus('Golden_Cake',ch,account,p.characters);
 assert(Math.abs(expected-actual)<Math.abs(expected)*1e-12,'Equipped food and Beanstalk match the original client parentheses');
 const second={...cake,amount:100};attrs.FoodSlotsOwned=2;attrs.EquipmentOrder[2]=['cake','cake'];attrs.EquipmentQuantity[2]=[cake.amount,100];
 const two=M.getGoldenFoodBonus('Golden_Cake',{...ch,food:[cake,second]},account,p.characters);
 assert(Math.abs(game.gold('DropRatez')-two)<two*1e-12,'Last matching equipped golden food wins');
}
console.log('Drop Rate: roster reconciliation, save immutability, Jelly gate/pool, uncapped Glunko, Cove override and native golden-food parity pass');



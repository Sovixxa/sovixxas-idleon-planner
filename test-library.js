'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={Date,structuredClone,console};vm.createContext(ctx);for(const name of ['dashboard-math.js','library-model.js'])vm.runInContext(fs.readFileSync(name,'utf8'),ctx);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw),M=ctx.LibraryModel;
const full=M.calculate(raw);assert.equal(full.maxBookLv,Math.round(full.sources.reduce((n,s)=>n+s.value,0)));assert.equal(full.maxBookLv,409);assert.equal(full.count,624);assert(full.automation);assert.equal(ctx.Date,Date);assert.equal(JSON.stringify(raw),before);assert(M.calculate({}).missing);
assert.equal(full.paid.owned,true);assert.equal(full.paid.withoutPack,396);assert.equal(full.paid.withPack,409);
const unpacked=structuredClone(raw),save=typeof unpacked.data==='string'?JSON.parse(unpacked.data):unpacked.data;
const bundles=typeof save.BundlesReceived==='string'?JSON.parse(save.BundlesReceived):save.BundlesReceived;delete bundles.ban_i;save.BundlesReceived=bundles;unpacked.data=save;
const noPack=M.calculate(unpacked);assert.equal(noPack.paid.owned,false);assert.equal(noPack.maxBookLv,396);assert.equal(noPack.paid.withPack,409);assert.equal(noPack.breakdown.pool.find(x=>x.name==='Daydreamer Pack').value,0);
const b=full.breakdown,sum=full.sources.find(x=>x.name==='Summoning victories').value;
assert(Math.abs(b.base*b.multipliers.reduce((n,s)=>n*s.value,1)*b.poolMultiplier-sum)<1e-9,'Every Summoning multiplier reconciles');
assert.equal(Math.round(b.minimum.reduce((n,s)=>n+s.value,0)),full.minBookLv);
const meals=b.meals.reduce((n,s)=>n+s.base*s.ribbon*s.mastery,0)*(1+b.mealBonuses.filter(s=>s.pool==='add').reduce((n,s)=>n+s.value,0)/100)*b.mealBonuses.filter(s=>s.pool==='multiply').reduce((n,s)=>n*s.value,1);
assert(Math.abs(meals-full.speed.find(s=>s.name==='Meal Bonus').value)<1e-8,'Meal multiplier breakdown reconciles');
// Execute the actual game-client Library-specific Summoning expression.
if(fs.existsSync('../audit/idleon-game.js')){
const client=fs.readFileSync('../audit/idleon-game.js','utf8'),start=client.indexOf(':19==t?3.5*'),end=client.indexOf(':20<=t&&33>=t?',start);assert(start>=0&&end>start);
const expression=client.slice(start+7,end);
for(const owned of [false,true])for(const lantern of [0,25,100,150])for(const gem of [0,1,5]){
 const attrs={DNSM:{h:{SummWinBonus:Array(32).fill(0)}},GemItemsPurchased:Array(12).fill(0),Tasks:[[[],[],[],[],[],[0,0,0,0,10]]]};attrs.DNSM.h.SummWinBonus[19]=4;attrs.GemItemsPurchased[11]=gem;attrs.Tasks=[];attrs.Tasks[2]=[];attrs.Tasks[2][5]=[0,0,0,0,10];
 const actual=vm.runInNewContext(expression,{t:19,c:{asNumber:Number},a:{engine:{getGameAttribute:k=>attrs[k]}},m:{_customBlock_Ninja:()=>30,_customBlock_Sailing:()=>lantern,_customBlock_GetSetBonus:()=>15,_customBlock_Thingies:()=>owned?1:0},p:{_customBlock_AchieveStatus:()=>1}});
 const a={sneaking:{pristineCharms:[{name:'Crystal_Comb',unlocked:true,baseValue:30}]},sailing:{artifacts:[{name:'The_Winz_Lantern',acquired:true,bonus:lantern}]},gemShopPurchases:attrs.GemItemsPurchased,achievements:Array(380).fill(null),armorSmithy:{sets:[{setName:'GODSHARD_SET',unlocked:true,bonusValue:15}]},bundles:[{name:'ban_i',owned}],meritsDescriptions:Array(6).fill(null)};
 a.achievements[373]={completed:true};a.achievements[379]={completed:true};a.meritsDescriptions[5]=Array(5).fill(null);a.meritsDescriptions[5][4]={level:10,bonusPerLevel:1};
 const predicted=ctx.DashboardMath.getLocalWinnerBonus(attrs.DNSM.h.SummWinBonus,a,19);assert(Math.abs(actual-predicted)<1e-9,'Game-client parity for relic, Gem Shop, and pack combinations');
}
}
const fakeMath={getBookLvRange:()=>({minBookLv:101,maxBookLv:125}),getTimeToNextBooks:n=>({value:Math.round(14400*(1+.1*n**1.4)),breakdown:{categories:[]}})};
const data={Tower:[0,1,0,0,0,0,0,0,5]},account={accountOptions:Array(56).fill(0),timeAway:{BookLib:100}};
let model=M.build(account,[],data,fakeMath,1000000);assert.equal(model.timers[0].at,1000000+(14400-100)*1000);assert(!model.timers.find(t=>t.target===20).ready);assert(model.timers.find(t=>t.target===20).at>model.timers.find(t=>t.target===5).at);
account.accountOptions[55]=20;model=M.build(account,[],data,fakeMath,1000000);assert(model.timers.find(t=>t.target===20).ready);assert.equal(model.timers[0].target,21);assert(model.timers.find(t=>t.target===40).at>model.timers[0].at);
model=M.build(account,[],data,fakeMath,null);assert.equal(model.count,null);assert.equal(model.timers.length,0);
console.log('Library: cap reconciliation, complete save, non-mutating decode, timestamp restoration, increasing waits, ready milestones, and missing timestamp pass.');

const tracked=M.characterBooks([{playerId:0,name:'Test',selectedTalentPreset:1,flatTalents:[{skillIndex:0,name:'HEALTH'},{skillIndex:10,name:'EXCLUDED'},{skillIndex:1,name:'MANA'},{skillIndex:615,name:'STAR'}]}],{SM_0:{0:125,1:150},SL_0:{0:0,1:150},SLpre_0:{0:100,1:0}},150);
assert.equal(tracked[0].talents.length,2);
assert.equal(tracked[0].talents[0].needsBook,true);
assert.deepEqual(Array.from(tracked[0].talents[0].levels),[100,0]);
assert.equal(tracked[0].talents[1].needsBook,false);
assert(full.characters.length>0);assert(full.characters[0].talents.length>0);
console.log('Library character tracking: eligibility, zero points, preset order, and book target pass.');

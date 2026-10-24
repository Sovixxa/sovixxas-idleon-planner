'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const {handler}=require('./client-source-utils'),M=require('./divinity-planner-model');
const client=fs.readFileSync('../audit/N.js','utf8'),catalog=require('./inspect-bonus-freshness').catalogs(client).values;
const options=Array(650).fill(0),div=Array(40).fill(0),attrs={OptionsListAccount:options,Divinity:div,Menagerie:Array.from({length:7},()=>Array(40).fill(0)),DNSM:{h:{}},CustomLists:{h:{Research:catalog.get('Research')}}};
const env={a:{engine:{getGameAttribute:k=>{assert(k in attrs,k);return attrs[k];}}},c:{asNumber:Number,getCurrentSceneName:()=> 'World5'},k:{_customBlock_getLOG:v=>Math.log(Math.max(1,v))/2.30259,_customBlock_Log2:v=>Math.log2(Math.max(1,v))},m:{},q:{}};
env.m._customBlock_Thingies=vm.runInNewContext('('+handler(client,'_customBlock_Thingies')+')',env);
env.q._customBlock_MenagerieStuff=vm.runInNewContext('('+handler(client,'_customBlock_MenagerieStuff')+')',env);
const near=(a,b,label)=>assert(Number.isFinite(a)&&Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-11,`${label}: ${a} vs ${b}`);
let checks=0;
for(let id=0;id<12;id++)for(const level of [0,1,10,100,400]){options[id<6?427+id:610+id]=level;near(M.bonus(id,level),env.m._customBlock_Thingies('CoralKidUpgBonus',id,0),'bonus '+id);near(M.cost(id,level),env.m._customBlock_Thingies('CoralKidUpgCost',id,0),'cost '+id);checks+=2;}
for(const points of [0,1,1e12,1e13,1e30,1e200])for(const kills of [0,65536,1e5,1e6,1e12])for(const hours of [0,1,120,121,10000]){
 div[24]=points;options[623]=kills;options[624]=hours;options[617]=30;const result=M.transmute(points,kills,hours,30);
 for(const [key,fn]of [['base','CK_BaseValue'],['killMulti','CK_KillMulti'],['timeMulti','CK_TimeMulti'],['raw','CK_TotalValue']])near(result[key],env.q._customBlock_MenagerieStuff(fn,0,0),fn);
 assert.equal(result.spirals,Math.floor(env.q._customBlock_MenagerieStuff('CK_TotalValue',0,0)));checks+=5;
}
// Exercise the actual context builder with independent source values and compare
// its two assembled rates against the game handler (not a duplicate formula).
const body=fs.readFileSync('divinity-breakdown.ts','utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
let v;
const helpers={
 getPostOfficeBonus:(_p,_n,index)=>{assert.equal(index,2,'Divinity must read BoxRewards 22c');return v.po;},getSigilBonus:()=>v.sigil,getActiveBubbleBonus:()=>v.bubble,getVialsBonusByStat:()=>v.vial,getCardLevel:()=>v.card,
 getStampsBonusByEffect:()=>v.stamp,getStatueBonus:()=>v.statue,getMealsBonusByEffectOrStat:()=>v.meal,getTalentBonus:()=>v.inner,
 getHighestTalentAcrossCharacters:(_c,name)=>name==='POLYTHEISM'?v.poly:v.shared,getStarSignBonus:()=>v.sign,getGuildBonusBonus:()=>v.guild,
 getArcadeBonus:()=>({bonus:v.arcade}),getStatsFromGear:()=>({value:v.gear,breakdown:[]}),getVoteBonus:()=>v.vote,getMeritocracyBonus:(_a,id)=>id===10?v.meritocracy:0,
 getArmorSetBonus:()=>v.armor,getUpgradeVaultBonus:(_a,id)=>id===71?v.vaultPoints:id===72?v.vaultExp:0,getSushiBonus:()=>v.sushi,getLabBonus:()=>0,
 getLegendTalentBonus:(_a,id)=>id===15?v.legendDiv:id===20?v.legendAll:0,isCompanionBonusActive:(_a,id)=>id===16?v.companion>0:id===32?v.companionAll>0:false,
 isCompanionLvl2Active:()=>v.doot,isMasteryBonusUnlocked:(_a,_r,i)=>i?v.masteryPoints:v.masteryExp,isMajorDivinityActive:()=>v.purrmep,
 isJadeBonusUnlocked:()=>v.blessingAmp,getLampBonus:()=>v.lamp,getAchievementStatus:(_a,id)=>id===298?v.ach1:v.ach2,bribes:Array(39).fill({name:'Test bribe'})
};
const box={...helpers};vm.createContext(box);vm.runInContext(esbuild.transformSync(body+'\nglobalThis.calculate=getDivinityBreakdown;',{loader:'ts'}).code,box);
const game=vm.runInNewContext('('+handler(client,'_customBlock_Divinity')+')',env);
env.p={_customBlock_getbonus2:(_a,id)=>id===505?v.poly:v.shared,_customBlock_AchieveStatus:id=>id===298?v.ach1:v.ach2,_customBlock_Labb:()=>v.sigil,_customBlock_GuildBonuses:()=>v.guild,_customBlock_ArcadeBonus:()=>v.arcade};
env.x={_customBlock_SkillStats:()=> (1+v.meritocracy/100)*(1+v.legendAll/100)*(1+v.companionAll),_customBlock_RunCodeOfTypeXforThingY:()=>v.card,_customBlock_ArbitraryCode:()=>v.statue};
env.k._customBlock_StampBonusOfTypeX=()=>v.stamp;env.k._customBlock_GetTalentNumber=()=>v.inner;env.q._customBlock_GetBribeBonus=()=>v.bribe;env.q._customBlock_MealBonus=()=>v.meal;env.v={_customBlock_EtcBonuses:()=>v.gear};
env.m._customBlock_Divinity=(type,t,i)=>type==='Bonus_MAJOR'?Number(v.purrmep):game(type,t,i);
env.m._customBlock_CompLV2=()=>Number(v.doot);env.m._customBlock_SushiStuff=()=>v.sushi;env.m._customBlock_Ninja=()=>Number(v.blessingAmp);
env.m._customBlock_Sailing=(_t,id)=>id===11?v.artifact1:v.artifact2;env.m._customBlock_Holes=()=>v.lamp;
env.m._customBlock_Companions=()=>v.companion;env.m._customBlock_RiftStuff=(_t,i)=>i?v.masteryPoints:v.masteryExp;
env.m._customBlock_Summoning=(type,id)=>type==='VotingBonusz'?v.vote:id===71?v.vaultPoints:v.vaultExp;env.m._customBlock_GetSetBonus=()=>v.armor;
const things=env.m._customBlock_Thingies;env.m._customBlock_Thingies=(type,id,i)=>type==='LegendPTS_bonus'?v.legendDiv:things(type,id,i);
for(const seed of [0,1,7,55])for(let style=0;style<8;style++){
 v={};['po','sigil','bubble','vial','stamp','statue','meal','inner','sign','guild','arcade','gear','vote','meritocracy','armor','vaultPoints','vaultExp','sushi','legendDiv','legendAll','lamp','bribe','poly','shared','artifact1','artifact2'].forEach((name,i)=>v[name]=seed*(i+1));
 Object.assign(v,{card:seed%8,companion:seed?.75:0,companionAll:seed?1:0,doot:seed>1,purrmep:seed>0,blessingAmp:seed>1,masteryPoints:seed>1?1:0,masteryExp:seed>0?1:0,ach1:seed>0?1:0,ach2:seed>1?1:0});
 options.fill(seed);div.fill(0);div[0]=style;div[25]=10+seed;for(let id=0;id<10;id++)div[28+id]=seed+id;
 attrs.CustomLists={h:{GodsInfo:catalog.get('GodsInfo')}};attrs.GemItemsPurchased=Array(131).fill(0);attrs.GemItemsPurchased[130]=seed%9;attrs.Spelunk=Array.from({length:14},()=>Array(6).fill(seed));attrs.Tasks=[[],[],[[],[],[],[],[0,0,0,0,seed]]];
 attrs.DNSM={h:{BoxRewards:{h:{'22c':v.po}},AlchBubbles:{h:{M3ACTIVE:v.bubble}},AlchVials:{h:{DivXP:v.vial}},StarSigns:{h:{62:v.sign}}}};
 const companions={list:[]};companions.list[16]={bonus:v.companion};companions.list[32]={bonus:v.companionAll};
 const account={accountOptions:options,companions,gemShopPurchases:attrs.GemItemsPurchased,divinity:{linkedStyles:[style],deities:Array.from({length:10},(_,id)=>({level:div[28+id]}))},sailing:{artifacts:Array.from({length:19},(_,id)=>({acquired:1,bonus:id===11?v.artifact1:v.artifact2}))},bribes:Array.from({length:39},()=>({done:true,value:v.bribe})),rift:{},totalSkillsLevels:{divinity:{rank:6}},tasks:attrs.Tasks};
 v.artifact1=Math.min(seed*25,200);v.artifact2=3*seed;account.looty={rawLootedItems:500+10*seed};
 const chars=[{level:seed*25,playerId:0,name:'Test',flatTalents:[{name:'POLYTHEISM',skillIndex:505},{name:'SHARED_BELIEFS',skillIndex:506}]}];
 const raw={Divinity:div,OptionsListAccount:options,Spelunk:attrs.Spelunk,Lv0_0:Array(15).fill(seed)};
 const result=box.calculate({account,characters:chars},raw,M)[0];
 near(result.points.rate,game('DivPTSPerHr',0,999),'points seed '+seed+' style '+style);near(result.exp.rate,game('DivPerHr_EXP',0,0),'EXP seed '+seed+' style '+style);checks+=2;
}
// Execute the original artifact-loop body at the two relevant indices. This
// catches tooltip/runtime mismatches without copying the formula into a test.
const sailing=handler(client,'_customBlock_Sailing');
const loopStart=sailing.indexOf('if(_=i++',sailing.indexOf('SailzArtiBonusDN=0'));
const loopEnd=sailing.indexOf('}}return 25==',loopStart);
assert(loopStart>0&&loopEnd>loopStart);
const artifactStep=new vm.Script(sailing.slice(loopStart,loopEnd));
attrs.CustomLists.h.ArtifactInfo=catalog.get('ArtifactInfo');
env.p._customBlock_MainframeBonus=()=>0;env.m._customBlock_Sailing=()=>1;
const artifactContext=vm.createContext({...env,i:11});
for(let tier=0;tier<=7;tier++)for(const highest of [0,199,200,201,1199,1200,1400,1600])for(const slab of [0,499,500,509,510,519,520,2000]){
 attrs.Sailing=[[],[],[],Array(30).fill(tier)];attrs.Cards=[[],Array(slab).fill(0)];
 attrs.DNSM={h:{SailzArtiBonusL:Array(30).fill(0),CalcTalentMAP:{h:{620:highest}}}};
 for(const id of [11,18]){artifactContext.i=id;artifactStep.runInContext(artifactContext);}
 const account={accountOptions:options,looty:{rawLootedItems:slab},sailing:{artifacts:Array.from({length:19},(_,i)=>({name:i===11?'Ashen_Urn':'Jade_Rock',acquired:tier}))}};
 const result=box.calculate({account,characters:[{playerId:0,level:highest}]},{},M)[0];
 const artifacts=result.points.multipliers.filter(s=>s.page==='sailing');
 near(artifacts[0].value,1+attrs.DNSM.h.SailzArtiBonusL[11]/100,'Ashen tier '+tier);
 near(artifacts[1].value,1+attrs.DNSM.h.SailzArtiBonusL[18]/100,'Jade tier '+tier);
 for(const metric of ['points','exp'])for(const group of ['additive','multipliers'])assert(result[metric][group].every(s=>s.limits?.kind&&s.limits?.detail),'Every source has a cap/scaling explanation');
 checks+=2;
}
const raw={data:{Divinity:Array(40).fill(0),OptLacc:JSON.stringify({425:10,616:3,617:4,618:5,619:6,620:7,621:8,623:10,624:20}),Menagerie:[[],[],[0,0,1]],ChestOrder:['CKsing'],ChestQuantity:[10],InventoryOrder_0:['CKsing'],ItemQTY_0:[5],Lv0_0:Array(15).fill(9000)}};
const before=JSON.stringify(raw),m=M.decode(raw);assert.equal(m.spirals,15);assert.equal(m.chosen,10);assert.equal(m.unlocked,true);assert.equal(m.upgrades[7].level,4);assert.equal(m.available,true);assert.equal(JSON.stringify(raw),before);assert.equal(M.decode({}).conversion,null);assert.equal(M.decode({}).upgrades[0].cost,null);
assert.equal(M.combine(2,[{value:null}],[]).rate,null);assert.equal(M.combine(0,[],[{value:9}]).rate,0);
console.log(`Divinity planner: ${checks} native formula comparisons, all 12 upgrade costs/bonuses, all styles, additive pools, multipliers, transmutation boundaries, aliases and missing data pass.`);

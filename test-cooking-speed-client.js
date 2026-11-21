'use strict';
// Independently execute the archived client's complete CookingSPEED expression.
// Dependency values come from the worker breakdown: this checks composition and
// worker/UI-facing rates, not independent correctness of every leaf subsystem.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.IDLEON_CLIENT_PATH||'../audit/live-N-nov15-hotfix-check.js','utf8');
const start=source.indexOf('"CookingSPEED"==d)return '),end=source.indexOf(';if("CookingFIRE"',start);
assert(start>=0&&end>start,'Native cooking expression must be present');
const expression=source.slice(start+'"CookingSPEED"==d)return '.length,end);
const ctx={console:{log(){},warn(){},error(){}},structuredClone};ctx.self=ctx;ctx.window=ctx;vm.createContext(ctx);
ctx.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(file,'utf8'),ctx));
let output;ctx.postMessage=value=>output=structuredClone(value);ctx.importScripts('cooking-worker.js');
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),read=x=>typeof x==='string'?JSON.parse(x):x;
ctx.onmessage({data:raw});assert(!output.error,output.error);
const tables=read(raw.data.Cooking),near=(a,b)=>assert(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);
// Do not merely feed a possibly wrong Prisma value back into the native speed
// expression. Execute PrismaBonusMult itself across the old and new cap edges.
const prismaStart=source.indexOf('"PrismaBonusMult"==d)return '),prismaEnd=source.indexOf(';if(',prismaStart);
assert(prismaStart>=0&&prismaEnd>prismaStart);
const prismaExpression=source.slice(prismaStart+'"PrismaBonusMult"==d)return '.length,prismaEnd);
const parsed=ctx.PrayerMath.parseData(structuredClone(raw.data),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const account=parsed.account,arcade=account.arcade.shop.find(row=>row.effect.includes('Prisma_Bonuses'));
const originalArcade=arcade.bonus;
const oldSources=ctx.PrayerMath.getPrismaMulti(account).breakdown.categories[0].sources;
const nonArcade=oldSources.filter(row=>row.name!=='Arcade').reduce((sum,row)=>sum+row.value,0);
for(const target of [199,200,209.4,250,299,300,350]){
 arcade.bonus=target-nonArcade;
 const prisma=ctx.PrayerMath.getPrismaMulti(account),s=Object.fromEntries(prisma.breakdown.categories[0].sources.map(row=>[row.name,row.value]));
 const native=vm.runInNewContext(prismaExpression,{m:{_customBlock_ArcaneType:()=>s.Tesseract,_customBlock_SushiStuff:()=>s.Sushi,_customBlock_Thingies:key=>key==='HaveW6Trophy'?s.Trophy:s['Legend Talent'],_customBlock_GamingStatType:()=>s.Palette,_customBlock_FarmingStuffs:()=>s['Exotic Market'],_customBlock_Companions:()=>s.Companion/50},p:{_customBlock_ArcadeBonus:()=>s.Arcade,_customBlock_Labb:()=>s['Ethereal Sigils']/.2},q:{_customBlock_JellyOperation:()=>s['Jelly Operator']}});
 near(prisma.value,native);
 near(prisma.value,Math.min(5,2+target/100));
 const diamond=account.alchemy.bubblesFlat.find(row=>row.bubbleName==='DIAMOND_CHEF');
 assert(ctx.PrayerMath.isPrismaBubble(account,diamond.bubbleIndex));
 const expectedPerMeal=(1+.3*diamond.level/(diamond.level+13))*native;
 const kitchen=ctx.PrayerMath.parseKitchens(tables,read(raw.data.Atoms),parsed.characters,account,{characterIndex:1})[0];
 const diamonds=account.cooking.meals.filter(meal=>meal.level>=11).length;
 near(kitchen.mealSpeedBreakdown.categories[0].sources.find(row=>row.name==='Diamond Chef (Bubble)').value,Math.pow(expectedPerMeal,diamonds));
}
arcade.bonus=originalArcade;
console.log('Native Prisma cap and Diamond Chef: seven cases around 4x/5x and 74-meal exponent pass.');
let checks=0;
for(const scenario of output.scenarios)for(const rate of scenario.values){
 const f=Object.fromEntries(rate.sources.map(s=>[s.name,s.value])),pct=name=>(f[name]-1)*100;
 const meals=stat=>scenario.mealBonuses.filter(m=>m.stat===stat).reduce((sum,m)=>sum+m.bonus,0);
 const farmGroup=meals('zMealFarm')?pct('Marshmallow (Meal)')/meals('zMealFarm'):1;
 const attrs={DNSM:{h:{AlchBubbles:{h:{MealSpdz:f['Diamond Chef (Bubble)']}},AlchVials:{h:{'6turtle':pct('Turtle Vial'),MealCook:pct('Cooking Speed Vials'),'6CookSpd':pct('Extra Vials')}},StarSigns:{h:{58:pct('Star Sign')}}}},Cooking:tables,Lv0:Array(17).fill(0),GemItemsPurchased:read(raw.data.GemItemsPurchased)};
 attrs.Lv0[16]=Math.round(farmGroup)*50-1;
 const call=(mapping)=>(...args)=>{const key=args.join('|');assert(Object.hasOwn(mapping,key),'Unexpected native dependency '+key);return mapping[key];};
 const env={a:{engine:{getGameAttribute:key=>{assert(Object.hasOwn(attrs,key),key);return attrs[key];}}},c:{asNumber:Number},
 k:{_customBlock_TalentCalc:call({'59':pct('Blood Marrow (Talent)')}),_customBlock_StampBonusOfTypeX:call({MealCook:pct('Stamps + Jewel')})},
 m:{_customBlock_FarmingStuffs:call({'CropSCbonus|3|0':f['Crop Depot']}),_customBlock_TalentEnh:call({'146':f['Enhancement Eclipse']}),
 _customBlock_Summoning:call({'EventShopOwned|53|0':f['Dough Roller (Event Shop)']-1,'VotingBonusz|13|0':pct('Vote Bonus'),'VaultUpgBonus|54|0':pct('Upgrade Vault'),'WinBonus|15|0':pct('Summoning rewards')}),
 _customBlock_Thingies:call({'ClamWorkBonus|10|0':(f['Clam Work']-1)/9}),_customBlock_AtomCollider:call({'AtomBonuses|8|0':f['Void Plate Chef (Atom)']}),
 _customBlock_GamingStatType:call({'MSA_Bonus|1|0':pct('Superbit')}),_customBlock_Sailing:call({'ArtifactBonus|13|0':pct('Triagulon (Artifact)')}),
 _customBlock_Minehead:call({'Button_Bonuses|7|0':pct('Button')}),_customBlock_Holes:call({'MonumentROGbonuses|0|2':pct('Monument'),'B_UPG|56|0':f.Schematic,'LampBonuses|0|0':pct('Lamp')})},
 p:{_customBlock_Breeding:call({'PetArenaCrucBonus|0|5|0':(f.Crucible-1)/9,'PetArenaCrucBonus|0|12|0':0}),_customBlock_ArcadeBonus:call({'28':pct('Arcade')}),
 _customBlock_MainframeBonus:call({'114':0,'100':f['Amethyst Rhinestone']}),_customBlock_AchieveStatus:call({'225':0,'224':0})},
 q:{_customBlock_MealBonus:meals,_customBlock_MenagerieStuff:call({'BoostQTY|4|0':pct('Menagerie')})},
 x:{_customBlock_RunCodeOfTypeXforThingY:call({'CardLv|w6c1':pct('Card (Cooking Multi)')/5,'CardLv|Boss4A':pct('Troll Card + Achievements')/6})}};
 const native=vm.runInNewContext('(function(b){return '+expression+';})',env);
 let total=0,index=0;
 for(let kitchen=0;kitchen<tables.length;kitchen++)if(tables[kitchen][0]>0){const speed=native(kitchen);near(speed,rate.speeds[index++]);total+=speed;checks++;}
 near(total,rate.speed);
}
console.log(`Native CookingSPEED composition: ${checks} kitchen/character/preset comparisons, selected farming groups and combined optimizer rates pass.`);

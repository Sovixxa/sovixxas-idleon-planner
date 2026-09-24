'use strict';
self.window=self;
importScripts('prayer-math-engine.js');
const read=v=>typeof v==='string'?JSON.parse(v):v;
function decode(raw,save){return PrayerMath.parseData(structuredClone(save),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}
function build(parsed,save){
 const cooking=read(save.Cooking),atoms=read(save.Atoms);
 if(!Array.isArray(cooking)||!cooking.some(k=>k?.[0]>0))throw new Error('No unlocked kitchen data.');
 const highestFarm=Math.max(...parsed.characters.map(c=>c.skillsInfo?.farming?.level||0));
 const marshmallow=PrayerMath.getMealsBonusByEffectOrStat(parsed.account,null,'zMealFarm');
 const account=parsed.account,chef=account.alchemy.bubblesFlat.find(b=>b.bubbleName==='DIAMOND_CHEF');
 const prisma=PrayerMath.getPrismaMulti(account);
 const diamond={level:chef?.level||0,prisma:PrayerMath.isPrismaBubble(account,chef?.bubbleIndex),prismaMulti:prisma.value,perMeal:PrayerMath.getBubbleBonus(account,'DIAMOND_CHEF',false),meals:account.cooking.meals.filter(m=>m.level>=11).length};
 const mealBonuses=account.cooking.meals.map(meal=>{
  const isolated={...account,cooking:{...account.cooking,meals:account.cooking.meals.map(m=>({...m,level:m.index===meal.index?m.level:0}))}};
  return {id:meal.index,name:meal.name||meal.rawName,stat:meal.stat,level:meal.level,bonus:PrayerMath.getMealsBonusByEffectOrStat(isolated,null,meal.stat)};
 });
 const mastery=account.cooking.cookingMastery;
 const nodes=account.cooking.meals.map(m=>({id:m.index,name:m.name||m.rawName,mealLevel:m.level,points:m.cookingMasteryNode?.level||0,stat:m.stat,effect:m.effect,bonus:mealBonuses.find(b=>b.id===m.index)?.bonus||0}));
 const values=parsed.characters.map((character,id)=>{
  const kitchens=PrayerMath.parseKitchens(cooking,atoms,parsed.characters,account,{characterIndex:id});
  const farm=character.skillsInfo?.farming?.level||0;
  const farmRatio=(1+marshmallow*Math.ceil((farm+1)/50)/100)/(1+marshmallow*Math.ceil((highestFarm+1)/50)/100);
  const speeds=kitchens.map(k=>k.mealSpeed*farmRatio);
  if(!speeds.length||speeds.some(s=>!Number.isFinite(s)||s<=0))throw new Error('Kitchen speed could not be calculated.');
  const speed=speeds.reduce((sum,s)=>sum+s,0);
  const ladleBonus=PrayerMath.getTalentBonus(character.flatTalents,'OVERFLOWING_LADLE');
  const sources=kitchens[0].mealSpeedBreakdown.categories[0].sources.map(s=>({...s,name:s.name==='Winner Bonus'?'Summoning rewards':s.name,value:s.value*(s.name==='Marshmallow (Meal)'?farmRatio:1)}));
  const product=sources.reduce((v,s)=>v*s.value,1);
  if(Math.abs(product-speeds[0])/speeds[0]>1e-10)throw new Error('Kitchen bonus breakdown does not match speed.');
  const kitchenSources=kitchens.map((k,index)=>({speed:speeds[index],factors:Object.fromEntries(k.mealSpeedBreakdown.categories[0].sources.filter(s=>['Meals (Cooking Speed)','Kitchen Eff (Meal)','Marshmallow (Meal)'].includes(s.name)).map(s=>[s.name,s.value*(s.name==='Marshmallow (Meal)'?farmRatio:1)]))}));
  return {id,name:character.name,speed,ladleBonus,kitchens:speeds.length,speeds,sources,kitchenSources};
 });
 const rift=read(save.Rift),companion=account.companions?.list?.[87];
 return {mastery:mastery?{...mastery,unlocked:Number(rift?.[0])>58||PrayerMath.isCompanionBonusActive(account,87),nodes,mealBonuses}:null,values,diamond,prisma:prisma.breakdown.categories[0].sources,mealBonuses,blood:parsed.characters.flatMap(c=>c.flatTalents.filter(t=>t.name==='BLOOD_MARROW').map(t=>({name:c.name,level:t.baseLevel,preset:c.selectedTalentPreset+1}))),totalMealLevels:account.cooking.meals.reduce((s,m)=>s+m.level,0)};
}
self.onmessage=event=>{
 try{
  const raw=event.data,save=structuredClone(raw.data||raw),parsed=decode(raw,save);
  if(!parsed.characters?.length)throw new Error('Character data is missing.');
  const current=build(parsed,save),scenarios=[{id:'current',label:'Saved active presets',...current,switches:[]}];
  const changed=structuredClone(save),switches=[];
  for(const c of parsed.characters){
   const active=c.flatTalents.find(t=>t.name==='BLOOD_MARROW');if(!active)continue;
   const other=read(save['SLpre_'+c.playerId]);
   // Raw secondary records are authoritative. Never substitute max book levels.
   if(!other||typeof other!=='object'||!(Number(other[59])>active.baseLevel))continue;
   const stuff=read(changed['PlayerStuff_'+c.playerId]);if(!Array.isArray(stuff))continue;
   changed['SL_'+c.playerId]=other;changed['SLpre_'+c.playerId]=read(save['SL_'+c.playerId]);stuff[1]=c.selectedTalentPreset===0?1:0;changed['PlayerStuff_'+c.playerId]=stuff;
   switches.push({name:c.name,preset:stuff[1]+1,before:active.baseLevel,after:Number(other[59])});
  }
  if(switches.length)scenarios.push({id:'secondary',label:'Voidwalker secondary preset',...build(decode(raw,changed),changed),switches});
  self.postMessage({values:current.values,scenarios});
 }catch(error){self.postMessage({error:error?.message||String(error)});}
};

(function(root){
'use strict';
const read=v=>typeof v==='string'?JSON.parse(v):v;
function metric(parsed,id,stat,save,M=root.PrayerMath){
 const a=parsed.account,cs=parsed.characters,c=cs[id];if(!c)throw Error('Select an imported character.');
 const out=(label,value,unit='',lower=false,note='')=>{if(!Number.isFinite(value))throw Error('This total is unavailable in the imported save.');return {label,value,unit,lower,note};};
 const personal=(label,value,unit='')=>out(label,value,unit,false,c.name+' · saved equipment and preset');
 const meal=s=>M.getMealsBonusByEffectOrStat(a,null,s);
 const skills={CookExp:'cooking',BrExp:'breeding',Lexp:'laboratory',DivExp:'divinity',GamingExp:'gaming',zFarmExp:'farming',zSneakExp:'sneaking',zSummonExp:'summoning'};
 if(skills[stat])return personal(skills[stat]+(stat==='CookExp'?' EXP multiplier':' EXP bonus'),M.getSkillExpMulti(skills[stat],c,cs,a,stat==='CookExp'?M.getMaxDamage(c,cs,a):undefined).value,stat==='CookExp'?'×':'%');
 if(['TotDmg','TotAcc','Def','Crit'].includes(stat)){
  const d=M.getMaxDamage(c,cs,a),map={TotDmg:['Maximum damage',d.maxDamage],TotAcc:['Accuracy',d.accuracy],Def:['Defence',d.defence.value],Crit:['Critical chance',d.critChance,'%']};return personal(...map[stat]);
 }
 switch(stat){
 case 'VIP':{
  const arena=i=>a.breeding.maxArenaLevel>=a.breeding.arenaBonuses[i].wave?1:0;
  return out('Library VIP membership',meal('VIP')+25*arena(1)+60*arena(10)+M.getSigilBonus(a.alchemy.p2w.sigils,'VIP_PARCHMENT'),'%');
 }
 case 'TimeEgg':return out('Egg incubation time',7200/(1+(M.getJewelBonus(a.lab.jewels,11,M.getLabBonus(a.lab.labBonuses,8))+meal('TimeEgg')+M.getBubbleBonus(a,'EGG_INK',false)+10*M.getAchievementStatus(a.achievements,220)+15*M.isMasteryBonusUnlocked(a.rift,a.totalSkillsLevels?.breeding?.rank,1)+M.getVoteBonus(a,16))/100),' seconds',true);
 case 'TPpete':return out('Toilet Paper Postage max talent level',Math.floor(Math.max(1,read(save.CauldronInfo)?.[3]?.[5]+meal('TPpete'))),' levels',false,'Maximum book level; allocated talent points stay unchanged.');
 case 'TDpts':return out('Tower Defence points multiplier',(1+meal('TDpts')/100)*(1+M.getMeritocracyBonus(a,16)/100),'×',false,'Points per kill also depend on the live enemy and wave.');
 case 'AtkSpd':return personal('AFK kills at saved target',M.getMaxDamage(c,cs,a).finalKillsPerHour,'/hr');
 case 'PetDmg':throw Error('Pet damage requires a selected combat team and its active abilities.');
 case 'Critter':throw Error('New trap yield requires the critter, trap type and placement character. Existing traps retain their saved yield.');
 case 'SplkExp':throw Error('Spelunking EXP is not calculated by the current account engine.');
 case 'zSumEss':{
  const h=a.hole?.holesObject;
  const value=(1+M.getWinnerBonus(a,'<x All Essence')/100)
   *(1+M.getLampBonus({holesObject:h,t:2,i:2,account:a})/100)
   *(1+M.getGambitBonus(a,5)/100)*Math.pow(1.4,a.gemShopPurchases?.[137]||0)
   *(1+M.getCharmBonus(a,'Stick_of_Chew')/100)
   *(1+M.getFountainBonusTotal(h,1,17)/100)
   *(1+M.getMonumentBonus({holesObject:h,t:1,i:4})/100)
   *(1+.1*M.isMasteryBonusUnlocked(a.rift,a.totalSkillsLevels?.summoning?.rank,1))
   *(1+M.getSummoningUpgradeBonus(a,62)*(a.accountOptions?.[319]||0)/100)
   *(1+(M.getBubbleBonus(a,'ESSENCE_CHAPTER',false)+meal('zSumEss')+(a.msaTotalizer?.essence?.value||0)+M.getSlabBonus(a,5))/100)
   *(1+.05*(M.getAchievementStatus(a.achievements,372)+M.getAchievementStatus(a.achievements,374)))
   *(1+M.getVoteBonus(a,28)/100);
  return out('All-colour essence multiplier',value,'×',false,'Shared account multiplier; each colour adds its own upgrades.');
 }
 case 'Cash':return personal('Money gain multiplier',M.getCashMulti(c,a,cs).cashMulti,'×');
 case 'Seff':return personal('All-skill efficiency multiplier',M.getAllEff(c,cs,a),'×');
 case 'Sprow':return personal('All-skill prowess',M.allProwess(c,a)*100,'%');
 case 'zGoldFood':return personal('Golden food effect',(M.getGoldenFoodMulti(c,a,cs).value-1)*100,'%');
 case 'MineCurr':return out('Minehead currency',a.minehead?.currencyGain,'/hr');
 case 'ResearchXP':return out('Research EXP',a.research?.researchEXPrateTOT,'/hr');
 case 'zJade':return out('Jade per successful find',M.getJadeRate(c,a),' jade',false,c.name+' · Sneaking Mastery '+(a.accountOptions?.[231]||0)+' · current floor and equipment');
 case 'GamingBits':return out('Gaming bit multiplier',M.getBitsMulti(a,cs).value,'×');
 case 'Breed':return out('Breedability multiplier',M.calcBreedabilityMulti(a,cs).value,'×');
 case 'Liquid12':case 'Liquid34':{
  const indices=stat==='Liquid12'?[0,1]:[2,3];return out('Liquid '+indices.map(i=>i+1).join(' + ')+' total capacity',indices.reduce((s,i)=>s+a.alchemy.liquidCauldrons[i].maxLiquid,0),' liquid');
 }
 case 'PxLine':case 'LinePct':return personal('Lab connection width',a.lab.playersCords.find(p=>p.playerId===c.playerId)?.lineWidth,' px');
 case 'Sailing':return out('Boat 1 effective speed',a.sailing.boats[0]?.speed.value,' distance/hr',false,'Includes the minimum travel-time cap.');
 case 'Lib':return out('Library: 0 to 20 books',a.libraryTimes.breakpoints.find(p=>p.label==='0 to 20')?.time,' seconds',true);
 case 'SplkPOW':return out('Spelunking power',a.spelunking.power.value);
 case 'SplkAmb':return out('Spelunking amber gain',a.spelunking.amberGain.value,' amber');
 case 'SplkUpg':return out('Learning the POW: next upgrade cost',a.spelunking.upgrades[0]?.cost,' amber',true);
 case 'PolyRefSpd':return out('Polymer refinery cycle',M.getRefineryCycleTimes(a,cs).polymerizeTime,' seconds',true);
 case 'zCropEvo':case 'zCropEvoSumm':return out('Plot 1 crop evolution chance',M.getCropEvolution(a,c,a.farming.plot[0],false).value,'% ',false,c.name+' · current plot 1 crop');
 case 'Rcook':case 'KitchC':case 'Mcook':case 'KitchenEff':case 'zMealFarm':{
  const kitchens=M.parseKitchens(read(save.Cooking),read(save.Atoms),cs,a,{characterIndex:id});
  if(stat==='Rcook')return out('Total recipe research speed',kitchens.reduce((s,k)=>s+k.fireSpeed,0),'/hr');
  if(stat==='KitchC')return out('Kitchen 1 next speed upgrade',kitchens[0]?.speedCost,' spice',true);
  const farm=c.skillsInfo?.farming?.level||0,highest=Math.max(...cs.map(c=>c.skillsInfo?.farming?.level||0)),marsh=meal('zMealFarm');
  const ratio=(1+marsh*Math.ceil((farm+1)/50)/100)/(1+marsh*Math.ceil((highest+1)/50)/100);
  return personal('Total kitchen speed',kitchens.reduce((s,k)=>s+k.mealSpeed,0)*ratio,'/hr');
 }
 case 'Npet':{
  const pet=a.breeding.pets.flat().find(p=>!p.unlocked&&p.breedingMultipliers);
  if(!pet)return out('New pet chance',100,'%',false,'All available pets are already unlocked.');
  return out('Next pet: '+pet.monsterName.replaceAll('_',' '),Math.min(100,100/pet.breedingMultipliers.totalChance),'%');
 }
 default:throw Error('A full account formula for this bonus is not yet available.');
 }
}
function compare(saved,test,next){return {...test,kind:'account',saved:saved.value,test:test.value,next:next?.value??null,relative:saved.value?100*(test.value/saved.value-1):0,nextRelative:next&&test.value?100*(next.value/test.value-1):0};}
const api={metric,compare};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CookingImpactModel=api;
})(typeof globalThis!=='undefined'?globalThis:self);

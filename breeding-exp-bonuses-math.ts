import {getHighestTalentAcrossCharacters} from './vendor/idleon-toolbox/parsers/talents';
import {getJewelBonus} from './vendor/idleon-toolbox/parsers/world-4/lab';
import {getMealsBonusByEffectOrStat} from './vendor/idleon-toolbox/parsers/world-4/cooking';
import {getCardBonusByEffect} from './vendor/idleon-toolbox/parsers/cards';
import {getStampsBonusByEffect} from './vendor/idleon-toolbox/parsers/world-1/stamps';
import {getVialsBonusByStat} from './vendor/idleon-toolbox/parsers/world-2/alchemy';
import {getStatueBonus} from './vendor/idleon-toolbox/parsers/world-1/statues';
import {isMasteryBonusUnlocked,isCompanionBonusActive} from './vendor/idleon-toolbox/parsers/misc';
import {getVoteBonus,getMeritocracyBonus} from './vendor/idleon-toolbox/parsers/world-2/voteBallot';
import {getUpgradeVaultBonus,calcUpgradeVaultBonus} from './vendor/idleon-toolbox/parsers/misc/upgradeVault';
import {getLegendTalentBonus} from './vendor/idleon-toolbox/parsers/world-7/legendTalents';
export function getBreedingExpBonuses(a:any,characters:any[]){
 const talents=characters.flatMap(c=>c.flatTalents||[]).filter(t=>t.name==='SHINING_BEACON_OF_EGG');
 const best=talents.reduce((b,t)=>t.level>(b?.level||0)?t:b,null);
 const jewel=a.lab?.jewels?.find((x:any)=>x.index===5),meal=a.cooking?.meals?.find((x:any)=>x.stat==='BrExp'),stamp=a.stamps?.skills?.find((x:any)=>x.stat==='BreedExp'),vial=a.alchemy?.vials?.find((x:any)=>x.stat==='BreedXP'),statue=a.statues?.[21],vault=a.upgradeVault?.upgrades||[],legend=a.legendTalents?.talents?.find((x:any)=>x.originalIndex===20);
 const maxMeals=(a.cooking?.meals||[]).map((x:any)=>x.stat==='BrExp'?{...x,level:a.cooking?.mealMaxLevel}:x);
 const values=[getHighestTalentAcrossCharacters(characters,'SHINING_BEACON_OF_EGG'),getJewelBonus(a.lab?.jewels,5),getMealsBonusByEffectOrStat(a,null,'BrExp'),2*(a.breeding?.petUpgrades?.[0]?.level||0),Math.min(50,getCardBonusByEffect(a.cards,'Breeding_EXP')),getStampsBonusByEffect(a,'Breeding_EXP_Gain'),getVialsBonusByStat(a.alchemy?.vials,'BreedXP'),getStatueBonus(a,21),25*isMasteryBonusUnlocked(a.rift,a.totalSkillsLevels?.breeding?.rank,0),getVoteBonus(a,16),getUpgradeVaultBonus(vault,59),1+getMeritocracyBonus(a,10)/100,1+getLegendTalentBonus(a,20)/100,1+(isCompanionBonusActive(a,32)?a.companions?.list?.[32]?.bonus||0:0)];
 const caps=[null,(jewel?.bonus||25)*(jewel?.multiplier||1),getMealsBonusByEffectOrStat({...a,cooking:{...a.cooking,meals:maxMeals}},null,'BrExp'),200,35,null,52*(vial?.multiplier||1),null,25,null,calcUpgradeVaultBonus(vault.map((x:any,i:number)=>i===59?{...x,level:x.maxLevel}:x),59),null,1+.75*(legend?.maxLevel||4),2.5];
 const levels=[best?`Lv ${best.level} effective`:'Not learned',jewel?.active?'Connected':jewel?.acquired?'Disconnected':'Not owned',`Lv ${meal?.level||0}`,`Lv ${a.breeding?.petUpgrades?.[0]?.level||0}`,a.cards?.TV?.amount?`${a.cards.TV.stars} stars`:'Not owned',`Lv ${stamp?.level||0}`,`Lv ${vial?.level||0}`,`Lv ${statue?.level||0}`,values[8]?'Unlocked':'Locked',values[9]?'Active':'Inactive',`Lv ${vault[59]?.level||0}`,values[11]>1?'Active':'Inactive',`Lv ${legend?.level||0}`,values[13]>1?'Active':'Not active'];
 const maxLevels=[`Account-dependent; saved base cap ${best?.maxLevel??'unknown'}`, 'One jewel',`Lv ${a.cooking?.mealMaxLevel??'?'}`, 'Lv 100','6 stars / card Lv 7', 'No fixed level cap','Lv 13','No fixed level cap','150 combined Breeding levels','Weekly ballot',`Lv ${vault[59]?.maxLevel??100}`, 'Weekly ballot',`Lv ${legend?.maxLevel??4} currently; up to 7 with Brown Fever`, 'Owned → upgraded'];
 const finite=(v:any)=>typeof v==='number'&&Number.isFinite(v)?v:null;
 const clean=values.map(finite),total=clean.some(x=>x===null)?null:Math.max(.1,(1+clean.slice(0,11).reduce((s,x)=>s+x!,0)/100)*clean.slice(11).reduce((s,x)=>s*x!,1));
 return {values:clean,caps:caps.map(finite),levels,maxLevels,total};
}

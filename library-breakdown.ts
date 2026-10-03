import {getCharmBonus} from './vendor/idleon-toolbox/parsers/world-6/sneaking';
import {getArmorSetBonus} from './vendor/idleon-toolbox/parsers/world-3/armorSmithy';
import {getAchievementStatus} from './vendor/idleon-toolbox/parsers/achievements';
import {getBribeBonus} from './vendor/idleon-toolbox/parsers/world-1/bribes';
import {getJewelBonus} from './vendor/idleon-toolbox/parsers/world-4/lab';
import {getShinyBonus} from './vendor/idleon-toolbox/parsers/world-4/breeding';
import {getRibbonBonus} from './vendor/idleon-toolbox/parsers/world-4/cooking';
import {isCompanionBonusActive} from './vendor/idleon-toolbox/parsers/misc';

// Each displayed value comes from the same helpers used by the book/meal formulas.
export const getLibraryBreakdown=(a:any)=>{
 const artifact=(name:string)=>a.sailing?.artifacts?.find((x:any)=>x.name===name&&x.acquired)?.bonus||0;
 const pack=!!a.bundles?.find((x:any)=>x.name==='ban_i'&&x.owned);
 const merit=a.meritsDescriptions?.[5]?.[4];
 const pool=[
  {name:'The Winz Lantern',value:artifact('The_Winz_Lantern'),page:'sailing',where:'W5 Sailing: find and upgrade The Winz Lantern. +25% per artifact tier, up to +150% at Transcendent.'},
  {name:'W6 winner-bonus merit',value:Math.min(10,(merit?.level||0)*(merit?.bonusPerLevel||0)),page:'tasks',where:'W6 Merit Shop: purchase larger Summoning winner bonuses, up to +10%.'},
  {name:'Regalis My Beloved',value:getAchievementStatus(a.achievements,373),page:'tasks',where:'W6 achievement: obtain a Regalis Summoning Familiar. +1%.'},
  {name:'Spectre Stars',value:getAchievementStatus(a.achievements,379),page:'tasks',where:'W6 achievement: complete all Spirited Valley constellations. +1%.'},
  {name:'Godshard equipment set',value:getArmorSetBonus(a,'GODSHARD_SET'),page:'armorSets',where:'Unlock the Godshard set bonus in the W3 Armor Smithy. +15%.'},
  {name:'Daydreamer Pack',value:pack?50:0,page:'gemShop',where:`${pack?'Owned':'Not owned'} · Paid limited-offer pack. Adds +50% to this pool; check the in-game offer for availability.`}
 ];
 const multipliers=[
  {name:'Crystal Comb',value:1+getCharmBonus(a,'Crystal_Comb')/100,page:'sneaking',where:'Pristine charm from Sneaking; also obtainable through the Gem Shop pristine-charm purchase. Multiplies Summoning rewards by 1.30× when unlocked.'},
  {name:'King of All Winners',value:1+(a.gemShopPurchases?.[11]||0)/10,page:'gemShop',where:`Gem Shop → W6 bonuses. ${a.gemShopPurchases?.[11]||0}/5 purchases; +0.10× per purchase, up to 1.50×.`}
 ];
 const minimum=[
  {name:'Base minimum',value:101,where:'Starting minimum roll.'},
  {name:'Burning Bad Books',value:5*(a.gemShopPurchases?.[113]||0),where:`Gem Shop → W3 bonuses. ${a.gemShopPurchases?.[113]||0}/4 purchases, +5 minimum levels each. Does not raise the maximum.`},
  {name:'Library Double Agent',value:getBribeBonus(a.bribes,'Library_Double_Agent'),where:'Purchase the Library Double Agent bribe for +4 minimum levels.'},
  {name:'Oxygen — Library Booker',value:a.atoms?.atoms?.[7]?.level||0,where:'Atom Collider: +1 minimum book level per Oxygen level.'}
 ];
 const meals=(a.cooking?.meals||[]).flatMap((m:any,i:number)=>m.stat==='Lib'?[{name:String(m.name||'Fortune Cookie').replaceAll('_',' '),base:(m.level||0)*m.baseStat,level:m.level||0,ribbon:getRibbonBonus(a,a.grimoire?.ribbons?.[28+i]),mastery:m.cookingMasteryNode?.multi??1}]:[]);
 const mealBonuses=[
  {name:'Black Diamond Rhinestone',value:getJewelBonus(a.lab?.jewels,16)||0,where:'Activate the Lab jewel; its meal effect adds to shiny pet meal bonuses.',pool:'add'},
  {name:'Shiny pet meal bonuses',value:getShinyBonus(a.breeding?.pets,'Bonuses_from_All_Meals'),where:'Level shiny pets that boost bonuses from all meals.',pool:'add'},
  {name:'Summoning meal rewards',value:1+(a.summoning?.winnerBonuses?.find((x:any)=>x.bonus==='<x Meal Bonuses')?.value||0)/100,where:'Summoning meal-bonus rewards, including their own winner multipliers.',pool:'multiply'},
  {name:'Wickerlight Spirit',value:1+(isCompanionBonusActive(a,162)?25*(a.companions?.list?.[162]?.bonus||0):0)/100,where:'Companion bonus: 1.25× meal effects, or 1.40× when upgraded.',pool:'multiply'}
 ];
 const battles=(a.summoning?.allBattles||[]).flat().filter((x:any)=>x.bonusId===19).map((x:any)=>({name:String(x.territoryName).replaceAll('_',' '),base:3.5*Number(x.bonusQty),won:!!x.won}));
 return {pool,multipliers,minimum,meals,mealBonuses,battles,base:3.5*(a.summoning?.winnerBonuses?.[19]?.baseValue||0),poolMultiplier:1+pool.reduce((n,s)=>n+s.value,0)/100};
};

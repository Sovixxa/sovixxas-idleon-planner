import './vendor/idleon-toolbox/polyfills';
export {growth} from './vendor/idleon-toolbox/utility/helpers';
export {calcUpgradeVaultBonus} from './vendor/idleon-toolbox/parsers/misc/upgradeVault';
import {parseData} from './vendor/idleon-toolbox/parsers/index';
import {getMaxDamage} from './vendor/idleon-toolbox/parsers/damage';
import {getClassExpMulti,getDropRate,getCashMulti,getAllSkillsExp,getAfkGain,getPrinterSampleRate} from './vendor/idleon-toolbox/parsers/character';
import {getAllEff} from './vendor/idleon-toolbox/parsers/efficiency';
import {getPrayerBonusAndCurse} from './vendor/idleon-toolbox/parsers/world-3/prayers';
import {getItemCapacity} from './vendor/idleon-toolbox/parsers/misc';
import {monsters,randomList} from './vendor/idleon-toolbox/data/website-data';
export {parseData,getMaxDamage,getClassExpMulti,getDropRate,getCashMulti,getAllSkillsExp,getAfkGain,getPrinterSampleRate,getAllEff,getPrayerBonusAndCurse,getItemCapacity,monsters,randomList};

export {getAllCap} from "./vendor/idleon-toolbox/parsers/misc";
export {getGoldenFoodMulti,getGoldenFoodBonus} from "./vendor/idleon-toolbox/parsers/misc";
export {getShinyChance} from "./vendor/idleon-toolbox/parsers/world-3/traps";
export {getStarSignBonus} from "./vendor/idleon-toolbox/parsers/starSigns";
export {getTalentBonus} from "./vendor/idleon-toolbox/parsers/talents";
export {getGiantMobChance} from './vendor/idleon-toolbox/parsers/misc';
export {mapNames,mapEnemiesArray,mapDetails,trappingInfo} from './vendor/idleon-toolbox/data/website-data';
export {getExoticMarketRotations} from './vendor/idleon-toolbox/parsers/world-6/farming';

export {getTesseractBonus} from './vendor/idleon-toolbox/parsers/class-specific/tesseract';
export {getMeritocracyBonus} from './vendor/idleon-toolbox/parsers/world-2/voteBallot';
export {isRiftBonusUnlocked} from './vendor/idleon-toolbox/parsers/world-4/rift';
export {getShinyBonus} from './vendor/idleon-toolbox/parsers/world-4/breeding';

export {getStampBonus,evaluateStamp} from './vendor/idleon-toolbox/parsers/world-1/stamps';

export {getPowerPerCycle,getPowerCap,calcCost,getRefineryCycleTimes,getSaltsBalance,getSaltMatsTimeLeft} from './vendor/idleon-toolbox/parsers/world-3/refinery';

export {parseKitchens,getMealsBonusByEffectOrStat} from './vendor/idleon-toolbox/parsers/world-4/cooking';

export {getPrismaMulti} from './vendor/idleon-toolbox/parsers/class-specific/tesseract';
export {getBubbleBonus,isPrismaBubble} from './vendor/idleon-toolbox/parsers/world-2/alchemy';

export {isCompanionBonusActive} from './vendor/idleon-toolbox/parsers/misc';

export {getResearchGridBonus} from './vendor/idleon-toolbox/parsers/world-7/research';

export {getSkillExpMulti,getJadeRate} from './vendor/idleon-toolbox/parsers/character';
export {allProwess} from './vendor/idleon-toolbox/parsers/efficiency';
export {getBitsMulti} from './vendor/idleon-toolbox/parsers/world-5/gaming';
export {calcBreedabilityMulti} from './vendor/idleon-toolbox/parsers/world-4/breeding';
export {getCropEvolution} from './vendor/idleon-toolbox/parsers/world-6/farming';

export {getJewelBonus,getLabBonus} from './vendor/idleon-toolbox/parsers/world-4/lab';
export {getSigilBonus} from './vendor/idleon-toolbox/parsers/world-2/alchemy';
export {getAchievementStatus} from './vendor/idleon-toolbox/parsers/achievements';
export {isMasteryBonusUnlocked} from './vendor/idleon-toolbox/parsers/misc';
export {getVoteBonus} from './vendor/idleon-toolbox/parsers/world-2/voteBallot';

export {getLampBonus} from './vendor/idleon-toolbox/parsers/world-5/caverns/the-lamp';
export {getGambitBonus} from './vendor/idleon-toolbox/parsers/world-5/caverns/gambit';
export {getFountainBonusTotal} from './vendor/idleon-toolbox/parsers/world-5/caverns/the-fountain';
export {getMonumentBonus} from './vendor/idleon-toolbox/parsers/world-5/caverns/bravery';
export {getSlabBonus} from './vendor/idleon-toolbox/parsers/world-5/sailing';
export {getWinnerBonus,getSummoningUpgradeBonus} from './vendor/idleon-toolbox/parsers/world-6/summoning';
export {getCharmBonus} from './vendor/idleon-toolbox/parsers/world-6/sneaking';

export {getJadeRateBreakdown} from './vendor/idleon-toolbox/parsers/character';
import {getBestActiveCharacter, getAllTalentAddedLevels, getHighestTalentAcrossCharacters} from './vendor/idleon-toolbox/parsers/talents';
export function getSpelunkingAmberHoard(parsed: any) {
  const characters=parsed.characters || [],active=getBestActiveCharacter(characters);
  const talentBonus=getHighestTalentAcrossCharacters(characters,'AMBER_HOARD',active) || 0;
  const candidates=characters.map((character: any)=>{
    const talent=character.flatTalents?.find((t: any)=>t.name==='AMBER_HOARD');
    if(!talent || !(talent.baseLevel>0))return null;
    const added=getAllTalentAddedLevels(235,active,character);
    return {character:character.name || `Character ${character.playerId+1}`,baseLevel:talent.baseLevel,addedLevels:added,level:talent.baseLevel+added};
  }).filter(Boolean).sort((a: any,b: any)=>b.level-a.level);
  const statueLevels=Math.round((parsed.account?.royalGuardian?.royalStatues || []).slice(0,8).reduce((total: number,statue: any)=>total+Math.max(0,Number(statue.level)||0),0));
  const percent=Math.max(0,talentBonus*statueLevels);
  return {talentBonus,statueLevels,percent,multiplier:1/(1+percent/100),talent:candidates[0] || null,activeCharacter:active?.name || null};
}
import {getMealsBonusByEffectOrStat as spelunkMealBonus} from './vendor/idleon-toolbox/parsers/world-4/cooking';
import {getSushiBonus as spelunkSushiBonus} from './vendor/idleon-toolbox/parsers/world-7/sushiStation';
import {getStaminaRegenRate as spelunkStaminaRegen} from './vendor/idleon-toolbox/parsers/world-7/spelunking';
import {getBubbleBonus as spelunkBubbleBonus} from './vendor/idleon-toolbox/parsers/world-2/alchemy';
import {getArcadeBonus as spelunkArcadeBonus} from './vendor/idleon-toolbox/parsers/world-2/arcade';
import {getLegendTalentBonus as spelunkLegendBonus} from './vendor/idleon-toolbox/parsers/world-7/legendTalents';
export function calculateSpelunkingDiscounts(mealBonus: number, firstSkill: number, sushiFirst: number, sushiSecond: number, jellyBonus: number) {
  const mealFactor=Math.max(1,Math.min(2,1+Math.floor(firstSkill/50))),sushiBonus=Math.max(sushiFirst,sushiSecond);
  const mealMultiplier=1/(1+mealBonus*mealFactor/100),sushiJellyMultiplier=Math.max(.1,1-(sushiBonus+jellyBonus)/100);
  return {mealBonus,firstSkill,mealFactor,mealMultiplier,sushiBonus,jellyBonus,sushiJellyMultiplier,multiplier:mealMultiplier*sushiJellyMultiplier};
}
export function getSpelunkingPlannerContext(parsed: any, researchCatalog: any[]) {
  const account=parsed.account,characters=parsed.characters||[],active=getBestActiveCharacter(characters),upgrades=account?.spelunking?.upgrades||[];
  const mealBonus=spelunkMealBonus(account,null,'SplkUpg')||0;
  const firstSkill=characters[0]?.skillsInfo?.spelunking?.level||0;
  const jellyBonus=account?.research?.jellyObstruction>22?Number(researchCatalog?.[47]?.[22])||0:0;
  const outsidePools: any={47:100+(spelunkBubbleBonus(account,'KATTLE_DA_GOAT',false)||0)+(spelunkArcadeBonus(account?.arcade?.shop,'Kruk_Bubble_LVs')?.bonus||0)},outsideCurves: any={},warnings: string[]=[];
  // Read the complete additive damage / Research pools, retaining other sources.
  const findPool=(node: any,label: string): any=>{if(!node||typeof node!=='object')return null;if(node.sources?.some((x: any)=>x.name===label))return node.sources;for(const value of Object.values(node)){const found=findPool(value,label);if(found)return found;}return null;};
  const sumPool=(sources: any[])=>sources.reduce((sum: number,x: any)=>sum+(Number(x.value)||0),0);
  const researchPool=account?.research?.researchEXPmultiBreakdown?.categories?.find((x: any)=>x.name==='Additive %')?.sources;
  if(researchPool)outsidePools[63]=100+sumPool(researchPool)-(upgrades[63]?.bonus||0);
  if(active){try{const pool=findPool(getMaxDamage(active,characters,account).damageBreakdown,'Spelunking (Fire Hardhat)');if(pool)outsidePools[64]=100+sumPool(pool)-(upgrades[64]?.bonus||0);}catch{warnings.push('Damage ranking uses the direct shop source; full damage context was unavailable.');}}
  // Small capped curves preserve nonlinear effects such as the drop-rate chip floor.
  for(const [index,calculate] of [[50,()=>getDropRate(active,account,characters).dropRate],[5,()=>spelunkStaminaRegen(account).value]] as any[]){
    const upgrade=upgrades[index];if(!upgrade||!active)continue;
    const original={level:upgrade.level,bonus:upgrade.bonus,baseBonus:upgrade.baseBonus};
    try{const curve=[];for(let level=0;level<=upgrade.x3;level++){upgrade.level=level;upgrade.bonus=upgrade.baseBonus=level*upgrade.x4;const value=calculate();if(!Number.isFinite(value)||value<=0)throw new Error('Invalid stat');curve.push(value);}outsideCurves[index]=curve;}catch{warnings.push(`Upgrade ${index}: account comparison unavailable; direct source used.`);}finally{Object.assign(upgrade,original);}
  }
  return {discounts:calculateSpelunkingDiscounts(mealBonus,firstSkill,spelunkSushiBonus(account,6),spelunkSushiBonus(account,27),jellyBonus),outsidePools,outsideCurves,statueDoubleBonus:spelunkLegendBonus(account,2)||0,representative:active?.name||null,elixirPreservation:account?.spelunking?.chapters?.[3]?.[2]?.bonus||0,warnings};
}

export {getOptimizedLandRankUpgrades,LAND_RANK_GOALS} from './vendor/idleon-toolbox/parsers/world-6/farming';

export {getKillroySchedule} from './vendor/idleon-toolbox/parsers/misc';

export {getResearchPlanningState} from './vendor/idleon-toolbox/parsers/world-7/research';

export {items as stampItemCatalog} from './vendor/idleon-toolbox/data/website-data';

export {getRespawnRate,getPlayerSpeedBonus,getPlayerFoodBonus} from './vendor/idleon-toolbox/parsers/character';
export {getCookingEff} from './vendor/idleon-toolbox/parsers/world-4/cooking';
export {getLabEfficiency} from './vendor/idleon-toolbox/parsers/world-4/lab';
export {getSpelunkingEfficiency} from './vendor/idleon-toolbox/parsers/world-7/spelunking';

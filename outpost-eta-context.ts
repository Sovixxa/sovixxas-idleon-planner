// Combat inputs for the single-save estimator. Formula references are in
// audit/live-N-third-pass-2026-09-28.js: ActiveKillClear, XtraClearKillz,
// UnitSpecEffect(4), RI_chance, RI_mobs and the Divine Intervention handler.
import {getMaxDamage,getMonsterHpTotal} from './vendor/idleon-toolbox/parsers/damage';
import {getRespawnRate,getPlayerCrystalChance} from './vendor/idleon-toolbox/parsers/character';
import {getTalentBonus,getHighestTalentAcrossCharacters} from './vendor/idleon-toolbox/parsers/talents';
import {getAdviceFishBonus,isBundlePurchased} from './vendor/idleon-toolbox/parsers/misc';
import {getPlayerLabChipBonus} from './vendor/idleon-toolbox/parsers/world-4/lab';
import {calcCardBonus} from './vendor/idleon-toolbox/parsers/cards';
import {getResearchGridBonus} from './vendor/idleon-toolbox/parsers/world-7/research';
import {getSushiBonus} from './vendor/idleon-toolbox/parsers/world-7/sushiStation';
import {getEffectiveDamage,getStrongestAttack} from './vendor/idleon-toolbox/parsers/misc/boneJoeCalculator';
import {monsters,mapMonsterCounts,mapEnemiesArray,armoryUpgrades,orbletMarket} from './vendor/idleon-toolbox/data/website-data';
export function getOutpostCombatContext(account:any,characters:any[],raw:any,mapIds:number[]){
 const parse=(v:any)=>typeof v==='string'?JSON.parse(v):v;
 const g=parse(raw.RoyalG)||[],levels=parse(g[2])||[],market=parse(g[23])||[];
 const arm=(i:number)=>Number(levels[i]||0)*Number(armoryUpgrades[i]?.bonusPerLevel||0);
 const orb=(i:number)=>Math.floor(Number(market[i]||0)*Number(orbletMarket[i]?.bonusPerLevel||0));
 // Research[47] from the verified client; the vendored shared list omits it.
 const jellyValues:any={2:25,8:25,35:1,56:1};
 const jelly=(i:number)=>account.research?.jellyObstruction>i?jellyValues[i]||0:0;
 return characters.map((c,index)=>({c,index})).filter(({c})=>c.class==='Royal_Guardian').map(({c,index})=>{
  const talent=(name:string,y=false)=>c.flatTalents?.find((t:any)=>t.name===name)?.level>0?getTalentBonus(c.flatTalents,name,y):0;
  const warbound=Math.max(1,getHighestTalentAcrossCharacters(characters,'WARBOUND_POLITICS',c));
  const fish=getAdviceFishBonus(account,6),clear=warbound*(1+(orb(3)+fish)/100)*(1+jelly(2)/100);
  const hasDI=!!c.talentsLoadout?.some((t:any)=>t.name==='DIVINE_INTERVENTION'&&t.level>0);
  const riChance=talent('REGAL_INTERVENTION')>0?Math.min(1,Math.max(0,talent('REGAL_INTERVENTION')/100*(1+orb(5)/100)+jelly(56)/1000)):0;
  const riMobs=Math.floor(talent('REGAL_INTERVENTION',true)+getSushiBonus(account,61)+jelly(35));
  const enhancement=getHighestTalentAcrossCharacters(characters,'ENHANCEMENT_ECLIPSE',c)>=225?20:0;
  const guardianDuration=talent('GUARDIAN_DISCIPLE')>0?Math.ceil(talent('GUARDIAN_DISCIPLE')):0;
  const knightlyDuration=talent('KNIGHTLY_DISCIPLE')>0?talent('KNIGHTLY_DISCIPLE')+enhancement:0;
  // DI affects crit damage as well as respawns. Each buff state needs its own
  // getMaxDamage invariant cache (critDamage is one of the cached invariants).
  const diTalent=c.flatTalents.find((t:any)=>t.name==='DIVINE_INTERVENTION');
  const normalBuffs=(c.activeBuffs||[]).filter((t:any)=>t.name!=='DIVINE_INTERVENTION');
  const shared:any={normal:{},di:{}};
  const maps=mapIds.map(id=>{
   const target=mapEnemiesArray[id],monster=monsters[target],count=Number(mapMonsterCounts[id])||0;
   // Gathering maps and event/boss monsters cannot use the normal full-wave model.
   if(!monster||monster.Type!=='Monster'||count<=0||!Number.isFinite(monster.RespawnTime)||monster.SpecialType==='a')return {id,supported:false};
   const onMap={...c,mapIndex:id,targetMonster:target},hp=getMonsterHpTotal(monster.MonsterHPTotal,onMap,account);
   const respawn=getRespawnRate(onMap,account);
   const combat=(mode:string,combatTarget=target)=>{const activeBuffs=mode==='di'&&diTalent?.level>0?[...normalBuffs,diTalent]:normalBuffs;
    const variant={...onMap,targetMonster:combatTarget,activeBuffs},p=getMaxDamage(variant,characters,account,shared[mode]),damage=getEffectiveDamage(p,variant),attack=getStrongestAttack(variant);
    return {damage,skillDamage:damage*Math.max(1,attack?.multi||1),hitChance:Math.max(0,Math.min(1,p.hitChance/100)),critDamage:p.critDamage,movementSpeed:p.movementSpeed};};
   const normal=combat('normal'),di=combat('di');
   // Reuse decoded individual bonuses, but match the newer client's card multiplier
   // and Jelly reward rather than the older shared parser's combined formula.
   const decoded=getPlayerCrystalChance(onMap,account,raw);
   const sources:any=Object.fromEntries(decoded.breakdown.categories.flatMap((g:any)=>g.sources).map((v:any)=>[v.name,Number(v.value)||0]));
   const bonus=(name:string)=>sources[name]||0;
   const crystalRaw=(bonus('Event Shop')+(1+bonus('Cmon Out Crystals')/100)
    *(1+(bonus('Post Office')+bonus('Crystal Shrine Crescent')+bonus('Companion (Armadillo)')+jelly(8))/100)
    *(1+bonus('Crystals 4 Days')/100)*(1+bonus('Crystallin Stamp')/100)
    *(1+(bonus('Poop Card')+bonus('Demon Genie Card'))/100))/2000;
   const eligible=id<350&&id!==166&&id!==306&&!['caveD','fm_rat'].includes(target)&&c.skillsInfo?.character?.level>19;
   const crystal:any={chance:eligible?Math.min(.1,Math.max(0,crystalRaw)):0,rawChance:crystalRaw,
    chainChance:Math.min(.99,Math.max(0,getPlayerLabChipBonus(c,account,9)/100)),
    guaranteed:eligible?Math.max(0,bonus('Remaining Crystal kills')):0,
    hp:getMonsterHpTotal(monster.MonsterHPTotal*15,onMap,account),sources:{...sources,Jelly:jelly(8)}};
   // The client copies the parent's stats into the crystal definition at spawn.
   // Scope this synthetic definition to synchronous stat evaluation and always restore it.
   const key='__outpostCrystal',previous=monsters[key];
   try{monsters[key]={...monster,MonsterHPTotal:monster.MonsterHPTotal*15,Defence:monster.Defence*2.5};
    crystal.normal=combat('normal',key);crystal.di=combat('di',key);
   }finally{if(previous)monsters[key]=previous;else delete monsters[key];}

   // Death handler: Math.max(adjusted respawn - UWU buff, 4). RG has no UWU
   // or Graveyard Shift talent; never borrow those other classes' buffs here.
   return {id,supported:true,monster:monster.Name,count,respawn:Math.max(4,respawn.respawnRate),uncappedRespawn:respawn.respawnRate,respawnBreakdown:respawn.breakdown,crystal,hp,...normal,normal,di};
  });
  const orbTalent=c.flatTalents.find((t:any)=>t.name==='ORB_OF_REMEMBRANCE');
  const orbContext={duration:talent('ORB_OF_REMEMBRANCE')+talent('ORB_OF_VERISIMILITUDE'),
   learned:!!orbTalent?.level,equipped:!!c.talentsLoadout?.some((t:any)=>t.name==='ORB_OF_REMEMBRANCE'&&t.level>0),
   regalExtra:1+Math.min(1,Math.max(0,getResearchGridBonus(account,191,0)/100))};
  const cards=(c.cards?.equippedCards||[]).map((card:any,slot:number)=>({slot:slot+1,name:card.displayName||'Empty',
   stars:card.stars,bonus:calcCardBonus(card),effect:card.effect||'',chipBoost:card.chipBoost||1,legendBonus:card.legendBonus||1}));
  const accountCoverage={damagePack:!!isBundlePurchased(account.bundles,'bon_a'),
   cardSet:c.cards?.cardSet||{},chips:(account.lab?.playersChips?.[c.playerId]||[]).map((chip:any)=>chip.name),
   ownedPacks:(account.bundles||[]).filter((b:any)=>b.owned).length};
  const equipped=(name:string)=>!!c.talentsLoadout?.some((t:any)=>t.name===name&&t.level>0);
  const active=(name:string)=>!!c.activeBuffs?.some((t:any)=>t.name===name&&t.level>0);
  const skillNotes:any={
   CRYSTALS_4_DAYYS:['Extra spawns','Saved effective star-talent bonus multiplies crystal spawn chance. It also affects crystal Orb counter weight above the 10% spawn cap.'],
   WARBOUND_POLITICS:['Direct credit',`${warbound.toFixed(3)}× account-wide best talent bonus; applies to active kills and militia.`],
   REGAL_INTERVENTION:['Extra spawns',`${(riChance*100).toFixed(3)}% chance of ${riMobs} extra mobs when DI triggers. Orblet, Sushi and Jelly bonuses included. No purified-map +10 on an unbuilt outpost.`],
   DIVINE_INTERVENTION:['Buff toggle','60-second buff; the toggle changes revive timing AND critical damage. Assumes maintained uptime and sufficient mana.'],
   GUARDIAN_DISCIPLE:['Wave-clear assumption',`${guardianDuration}s duration. Nearby attack every 2s; a 1/3 daggerang chance every 3s. Marks respawns within 180px as Regal; does not create extra monsters or multiply outpost credit. Placement and projectile kills belong in wave-clear time.`],
   KNIGHTLY_DISCIPLE:['Wave-clear assumption',`${knightlyDuration.toFixed(2)}s talent duration${enhancement?' including Enhancement Eclipse +20s':''}. Shockwave schedule every 4.3s. Placement, overlap and kills belong in wave-clear time.`],
   MEGA_MONGORANG:['Wave-clear assumption',`+${talent('MEGA_MONGORANG').toFixed(1)}% daggerang size and +${Math.floor(talent('MEGA_MONGORANG',true))} targets. Coverage is not a separate credit multiplier.`],
   IMBUED_SHOCKWAVES:['Wave-clear assumption',`${Math.min(100,talent('IMBUED_SHOCKWAVES')).toFixed(1)}% proc chance on basic spear attacks. Coverage depends on weapon and positioning.`],
   DAGGERANG:['Damage + wave-clear assumption','Equipped skill damage participates in the fast damage scenario. Multi-target coverage, return path and cooldown belong in wave-clear time.'],
   SHOCKWAVE_SLASH:['Damage + wave-clear assumption','Equipped skill damage participates in the fast damage scenario. Target coverage and cast rotation belong in wave-clear time.'],
   POWER_STRIKE:['Damage + wave-clear assumption','Equipped attack included in the strongest-skill scenario; the main estimate uses average basic-hit damage.'],
   WHIRL:['Damage + wave-clear assumption','Equipped attack included in the strongest-skill scenario; cast rotation belongs in wave-clear time.'],
   BALANCED_SPIRIT:['Saved buff','Saved active state affects accuracy, damage and defence; equipping a skill does not mean this buff is active.'],
   FIRMLY_GRASP_IT:['Saved buff','Saved active state contributes to decoded STR and resulting combat stats.'],
   MASTERY_UP:['Combat stats','Included in damage mastery and average-hit damage.'],
   PRECISION_POWER:['Combat stats','Included using each map’s accuracy requirement and your refinery ranks.'],
   GAMER_STRENGTH:['Combat stats','Gaming-level weapon power is included in the damage calculation.'],
   GILDED_SWORD:['Combat stats','Included in the damage calculation.'],
   ORB_OF_REMEMBRANCE:['Orb calibration',`${orbContext.duration.toFixed(2)}s nominal Orb duration including Verisimilitude. EXP/drop effects do not multiply outpost credit; the counter can calibrate physical kills after conversion.`],
   ORB_OF_VERISIMILITUDE:['No direct clearing bonus',`Longer Orb; Regal deaths average ${(1+orbContext.regalExtra).toFixed(3)} Orb counts including Royal Rewards research. These extra counts are removed when calibrating outpost kills.`],
   "LIL'_ORBLETS":['No direct clearing bonus','Orblet drops do not directly clear outposts. Purchased market bonuses are counted separately.'],
   AESTHETIC_POLITICS:['No direct clearing bonus','Marble drop multiplier, not clearing credit.'],
   CASTLE_CONVENE:['No direct clearing bonus','Teleport/resource collection; no direct clearing multiplier.'],
   ROYAL_ARMORY:['No direct clearing bonus','This talent boosts resource collection. Purchased Armory upgrades are counted separately.'],
   INDUSTRIAL_POLITICS:['No direct clearing bonus','Resource collection multiplier, not clearing credit.'],
   AMBER_HOARD:['No direct clearing bonus','Spelunking shop discount.'],
   SPELUNKING_SPECIALTY:['No direct clearing bonus','Spelunking stamina/EXP.'],
   "PIT_O'_PAGES":['No direct clearing bonus','Spelunking efficiency/speed.'],
   GRAND_VEIN:['No direct clearing bonus','Spelunking discovery chance.'],
   GRADED_RATE:['No direct clearing bonus','Drop rate, not extra outpost credit.']
  };
  const skills=Object.entries(skillNotes).map(([name,note]:any)=>{const t=[...c.flatTalents,...(c.flatStarTalents||[])].find((t:any)=>t.name===name);return {name,level:t?.level||0,baseLevel:t?.baseLevel||0,superTalent:!!t?.isSuperTalent,equipped:equipped(name),active:active(name),category:note[0],note:note[1]};});
  const totalArmory=levels.reduce((sum:number,v:any)=>sum+(Number(v)||0),0);
  const upgrades=[...([58,23].map(id=>{const u=armoryUpgrades[id],level=Number(levels[id]||0);return {key:id===58?'armory':'militiaArmory',name:u.name.replaceAll('_',' '),level,maxLevel:u.maxLevel,step:u.bonusPerLevel,unlocked:level>0||totalArmory>=u.unlockTotalLevels,where:'Royal Armory'};})),...([3].map(id=>{const u=orbletMarket[id],level=Number(market[id]||0);return {key:'orblet',name:'Orblet clearing bonus',level,maxLevel:u.maxLevel,step:Math.floor((level+1)*u.bonusPerLevel)-orb(id),unlocked:true,where:'Orblet Market'};}))];
  const militiaByWorld=Array.from({length:8},(_,w)=>(parse(g[6+2*w])||[]).filter((v:any)=>Number(v)===4).length);
  const crystalCards=['Poop','Demon_Genie'].map(name=>{const card=Object.values(account.cards||{}).find((v:any)=>v.displayName?.replaceAll(' ','_')===name) as any;return {name:name.replaceAll('_',' '),owned:!!(card?.amount>0),equipped:cards.some((v:any)=>v.name.replaceAll(' ','_')===name)};});
  const warboundTalent=c.flatTalents.find((t:any)=>t.name==='WARBOUND_POLITICS');
  const regalTalent=c.flatTalents.find((t:any)=>t.name==='REGAL_INTERVENTION');
  const starTalent=c.flatStarTalents?.find((t:any)=>t.name==='CRYSTALS_4_DAYYS');
  const optimizerInputs={regalShop:{level:Number(market[5]||0),maxLevel:orbletMarket[5].maxLevel,step:orbletMarket[5].bonusPerLevel},warbound:warboundTalent?{x1:warboundTalent.x1,x2:warboundTalent.x2}:null,
   regal:regalTalent?.level>0?{level:regalTalent.level,x1:regalTalent.x1,x2:regalTalent.x2,y1:regalTalent.y1,y2:regalTalent.y2,market:orb(5)}:null,
   crystalTalent:starTalent?.level>0?{level:starTalent.level,x1:starTalent.x1,x2:starTalent.x2}:null,
   fish:account.adviceFish?.upgrades?.[6]?{level:account.adviceFish.upgrades[6].level,scale:account.adviceFish.upgrades[6].x2}:null};
  const ownedCombatCards=Object.values(account.cards||{}).filter((v:any)=>v.amount>0&&/respawn|crystal|accuracy|damage|crit/i.test(v.effect||'')).map((v:any)=>({name:v.displayName,effect:v.effect,bonus:calcCardBonus(v),equipped:cards.some((e:any)=>e.name===v.displayName)}));
  return {optimizerInputs,ownedCombatCards,upgrades,militiaByWorld,crystalCards,index,currentMap:c.mapIndex,cards,accountCoverage,orb:orbContext,name:c.name||`Character ${index+1}`,hasDI,knowsDI:talent('DIVINE_INTERVENTION')>0,diCritBonus:talent('DIVINE_INTERVENTION'),riChance,riMobs,guardianEquipped:equipped('GUARDIAN_DISCIPLE'),guardianDuration,knightlyDuration,knightlyEnhancement:enhancement,skills,activeBuffs:(c.activeBuffs||[]).map((t:any)=>t.name),creditPerKill:arm(58)>=1?(1+arm(58)/100)*clear:0,militiaPerHour:4000*(1+arm(23)/100)*clear,warbound,armory:arm(58),militiaArmory:arm(23),orblet:orb(3),fish,jelly:jelly(2),maps};
 });
}

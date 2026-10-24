import {getPostOfficeBonus} from './vendor/idleon-toolbox/parsers/world-3/postoffice';
import {getSigilBonus,getActiveBubbleBonus,getVialsBonusByStat} from './vendor/idleon-toolbox/parsers/world-2/alchemy';
import {getCardLevel} from './vendor/idleon-toolbox/parsers/cards';
import {getStampsBonusByEffect} from './vendor/idleon-toolbox/parsers/world-1/stamps';
import {getStatueBonus} from './vendor/idleon-toolbox/parsers/world-1/statues';
import {getMealsBonusByEffectOrStat} from './vendor/idleon-toolbox/parsers/world-4/cooking';
import {getHighestTalentAcrossCharacters,getTalentBonus} from './vendor/idleon-toolbox/parsers/talents';
import {getStarSignBonus} from './vendor/idleon-toolbox/parsers/starSigns';
import {getGuildBonusBonus} from './vendor/idleon-toolbox/parsers/guild';
import {getArcadeBonus} from './vendor/idleon-toolbox/parsers/world-2/arcade';
import {getStatsFromGear} from './vendor/idleon-toolbox/parsers/items';
import {getVoteBonus,getMeritocracyBonus} from './vendor/idleon-toolbox/parsers/world-2/voteBallot';
import {getArmorSetBonus} from './vendor/idleon-toolbox/parsers/world-3/armorSmithy';
import {getUpgradeVaultBonus} from './vendor/idleon-toolbox/parsers/misc/upgradeVault';
import {getSushiBonus} from './vendor/idleon-toolbox/parsers/world-7/sushiStation';
import {getLegendTalentBonus} from './vendor/idleon-toolbox/parsers/world-7/legendTalents';
import {isCompanionBonusActive,isCompanionLvl2Active,isMasteryBonusUnlocked} from './vendor/idleon-toolbox/parsers/misc';
import {isMajorDivinityActive} from './vendor/idleon-toolbox/parsers/world-5/divinity';
import {isJadeBonusUnlocked} from './vendor/idleon-toolbox/parsers/world-6/sneaking';
import {getLampBonus} from './vendor/idleon-toolbox/parsers/world-5/caverns/the-lamp';
import {getAchievementStatus} from './vendor/idleon-toolbox/parsers/achievements';
import {bribes} from './vendor/idleon-toolbox/data/website-data';
import {getLabBonus} from './vendor/idleon-toolbox/parsers/world-4/lab';

// Source groups transcribed from the supplied client's DivPTSPerHr and
// DivPerHr_EXP. Percent pools are added once; every factor multiplies separately.
export function getDivinityBreakdown(parsed:any,raw:any,model:any){
 const a=parsed.account,chars=parsed.characters||[],kid=model.decode(raw),num=(v:any)=>Number(v)||0;
 const source=(name:string,value:number,page:string,where:string)=>({name,value:Number.isFinite(value)?value:null,page,where});
 const pct=(v:number)=>1+v/100;
 const option=(id:number)=>num(a.accountOptions?.[id]);
 const kb=(id:number)=>model.bonus(id,option(id<6?427+id:610+id));
 const companion=(id:number)=>isCompanionBonusActive(a,id)?num(a.companions?.list?.[id]?.bonus):0;
 const purrmep=chars.some((c:any)=>isMajorDivinityActive(c,a,6));
 const gem=1+num(a.gemShopPurchases?.[130])/4;
 const blessingAmp=1+.05*(isJadeBonusUnlocked(a,'True_Godly_Blessings')?1:0)*num(kid.rank);
 const blessing=(id:number,per:number)=>num(a.divinity?.deities?.[id]?.level)*per*blessingAmp;
 // Read the runtime rules, not artifact tooltip numbers (which differ at high tiers).
 const artifact=(id:number)=>{
  const tier=num(a.sailing?.artifacts?.[id]?.acquired);
  if(!tier)return 0;
  if(id===11)return Math.min(Math.max(0,...chars.map((c:any)=>num(c.level))),200*tier);
  const amp=(1+num(getLabBonus(a.lab?.labBonuses,15))/100)*(1+num(getLegendTalentBonus(a,28))/100)*(1+num(getMeritocracyBonus(a,23))/100)*(1+num(getUpgradeVaultBonus(a.upgradeVault?.upgrades,74))/100);
  // Supplied client tests column 13 even for tier 7; Jade Rock's column 13
  // is the sixtupled description, so that tier does not receive a 7x factor.
  return 3*Math.floor(Math.max(0,num(a.looty?.rawLootedItems)-500)/10)*amp*(tier===7?1:tier);
 };
 const vote=num(getVoteBonus(a,23));
 const shared=[source('Divinity gem-shop purchase',gem,'gemShop','+25% per purchase, as a separate multiplier.'),source('Purrmep major link',purrmep?2:1,'divinity','Account-wide double points and EXP while the major effect is active, including supported extra god links.')];
 const pointFactors=[...shared,
  source('King Doot · Pet Mart+',1+.25*(isCompanionLvl2Active(a,0)?1:0),'pets','Upgraded Doot adds a separate 1.25× points multiplier; it does not multiply Divinity EXP.'),
  source('Sushi reward 47',pct(num(getSushiBonus(a,46))),'sushi','Divinity points reward; applies to points only.'),
  source('Singularity · Transmutation',pct(kb(6)),'coralKid','Coral Kid upgrade 7: +100% per level, in its own multiplier.'),
  ...[[0,2],[1,3],[3,3],[5,4]].map(([id,per])=>source(`${['Snehebatu','Arctis','','Harriep','','Omniphau'][id]} blessing`,pct(blessing(id,per)),'divinity','Blessing levels × per-level bonus × True Godly Blessings amplifier. Each god multiplies independently.')),
  ...[11,18].map(id=>source(String(a.sailing?.artifacts?.[id]?.name||`Sailing artifact ${id+1}`).replaceAll('_',' '),pct(artifact(id)),'sailing','Saved artifact tier and its account scaling; each artifact is a separate multiplier.')),
  source('Divinity weekly vote',pct(vote),'votes','This vote is multiplicative for points, additive for Divinity EXP.'),
  source('Lamp · Divinity points',pct(num(getLampBonus({holesObject:a.hole?.holesObject,t:1,i:2,account:a}))),'holeLamp','Lamp wish bonus, including its Zenith multiplier.'),
  source('Coral Kid · Reef Devotion',kid.reefLevels===null?NaN:pct(kid.reefLevels*kb(4)),'coralKid','Total of the first six reef upgrade levels × Coral Kid upgrade 5.')
 ];
 const expFactors=[...shared,
  source('Legend talent · Divinity EXP',pct(num(getLegendTalentBonus(a,15))),'legendTalents','Divinity-specific Legend Talent multiplier.'),
  source('Meritocracy · all skill EXP',pct(num(getMeritocracyBonus(a,10))),'meritocracy','Part of the shared AllSkillxpMULTI product.'),
  source('Legend talent · all skill EXP',pct(num(getLegendTalentBonus(a,20))),'legendTalents','Part of the shared AllSkillxpMULTI product.'),
  source('All-skill EXP companion',1+companion(32),'pets','Companion 33, including its upgraded bonus; part of AllSkillxpMULTI.'),
  source('Coral Kid · Volcano Link',pct(kb(0)),'coralKid','Coral Kid upgrade 1: +10% per level, in its own multiplier.'),
  source('Singularity · Divinity EXP',pct(kb(8)),'coralKid','Coral Kid upgrade 9: +50% per level, in its own multiplier.'),
  source('Divinity EXP companion',1+companion(16),'pets','Companion 17 multiplies Divinity EXP separately.')
 ];
 return chars.map((ch:any)=>{
  const po=num(getPostOfficeBonus(ch.postOffice,'Box_of_Gosh',2));
  const mastery=(i:number)=>a.rift?isMasteryBonusUnlocked(a.rift,a.totalSkillsLevels?.divinity?.rank,i):0;
  const talent=(id:number)=>chars.flatMap((c:any)=>c.flatTalents||[]).find((t:any)=>Number(t.skillIndex)===id)?.name;
  const high=(id:number)=>{const name=talent(id);return name?num(getHighestTalentAcrossCharacters(chars,name,ch)):0;};
  const pointAdd=[source('Box of Gosh',po,'postOffice','Third Post Office box bonus (22c), specific to the selected character.'),source('Achievement 299',10*getAchievementStatus(a.achievements,298),'tasks','+10% Divinity points when completed.'),source('Achievement 305',10*getAchievementStatus(a.achievements,304),'tasks','+10% Divinity points when completed.'),source('Divinity skill mastery',15*mastery(1),'rift','+15% at the Divinity points mastery threshold.'),source(String((bribes as any)[38]?.name||'Divinity bribe').replaceAll('_',' '),a.bribes?.[38]?.done?num(a.bribes[38].value):0,'bribes','Divinity points bribe (client slot 38).'),source('Upgrade Vault · Divinity points',num(getUpgradeVaultBonus(a.upgradeVault?.upgrades,71)),'upgradeVault','Vault upgrade 72 adds to the points pool.')];
  const gear=getStatsFromGear(ch,74,a);
  const expAdd=[
   source('God Rank',10*num(kid.rank),'divinity','+10% per God Rank.'),source('Box of Gosh',po,'postOffice','Third box bonus (22c) also adds to Divinity EXP.'),
   source('Div Spiral sigil',num(getSigilBonus(a.alchemy?.p2w?.sigils,'DIV_SPIRAL')),'sigils','Alchemy sigil bonus.'),
   source('Divinity EXP card',6*getCardLevel(a.cards,'w5a5'),'cards','+6% per card level; uses the account card collection.'),
   source('Divinity EXP stamp',num(getStampsBonusByEffect(a,'Divinity_EXP_Gain')),'stamps','Stamp levels and stamp amplifiers.'),
   source('Pious at Heart',num(getActiveBubbleBonus(ch.equippedBubbles,'PIOUS_AT_HEART',a)),'alchemy','Active bubble on this character, including applicable bubble multipliers.'),
   source('Divinity statue',num(getStatueBonus(a,23,ch.flatTalents)),'statues','Statue bonus including applicable statue amplifiers.'),
   source('Divinity EXP meals',num(getMealsBonusByEffectOrStat(a,null,'DivExp')),'cooking','Combined Divinity EXP meal effect.'),
   source('Divinity EXP vial',num(getVialsBonusByStat(a.alchemy?.vials,'DivXP')),'vials','Alchemy vial effect.'),
   source('Inner Peace',num(getTalentBonus(ch.flatTalents,'INNER_PEACE')),'characters','Selected character’s talent bonus.'),
   source('World 5 merit',10*num(a.tasks?.[2]?.[4]?.[4]),'tasks','+10% per merit level.'),source('Divinity skill mastery',25*mastery(0),'rift','+25% at the Divinity EXP mastery threshold.'),
   source('Divinity EXP star sign',num(getStarSignBonus(ch,a,'Divinity_EXP')),'starSigns','Selected character’s sign, with applicable sign amplifiers.'),
   source('Guild skill EXP',num(getGuildBonusBonus(a.guild?.guildBonuses,14)),'','Guild bonus 15.'),source('Arcade · Divinity EXP',num(getArcadeBonus(a.arcade?.shop,'Divinity_EXP')?.bonus),'arcade','Arcade level and tier.'),
   source('Equipment · Divinity EXP',num(gear.value),'characters','Selected character’s equipment effects.'),source('Divinity weekly vote',vote,'votes','Added inside the EXP pool, unlike the points vote multiplier.'),
   source('Magma armor set',num(getArmorSetBonus(a,'MAGMA_SET')),'armorSets','Account armor-set bonus.'),source('Upgrade Vault · Divinity EXP',num(getUpgradeVaultBonus(a.upgradeVault?.upgrades,72)),'upgradeVault','Vault upgrade 73 adds to the EXP pool.')
  ];
  const styleId=num(a.divinity?.linkedStyles?.[ch.playerId]),pointsBase=[1,2,4,0,2,0,8,15][styleId]??null,expBase=[1,2,1,1,7,3,8,10][styleId]??null;
  const result={id:ch.playerId,name:ch.name,styleId,points:model.combine(pointsBase,pointAdd,[...pointFactors,source('Polytheism · shared points bonus',pct(high(505)),'characters','Highest effective Polytheism talent across characters; the client uses talent 505 for points.')]),exp:model.combine(expBase,expAdd,[...expFactors,source('Shared Beliefs',pct(high(506)),'characters','Highest effective Shared Beliefs talent across characters; talent 506 multiplies EXP.')]),gear:gear.breakdown};
  for(const metric of ['points','exp'])for(const group of ['additive','multipliers']){
   // Clone shared rows: limits may depend on this character and metric.
   result[metric][group]=result[metric][group].map((s:any)=>({...s,limits:divinityLimits(s,metric,a,ch,kid),maximum:divinityMaximum(s,metric,a,ch,kid)}));
  }
  return result;
 });
}

// A cap on a level, an asymptote and a composite account bonus are different
// things. Never present an unverified global maximum as a hard cap.
function divinityLimits(s:any,metric:string,a:any,ch:any,kid:any){
 const f=(v:any)=>v==null?'?':Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
 const note=(kind:string,detail:string)=>({kind,detail});
 const cap=(current:any,max:any,detail:string)=>note(`${f(current)} / ${f(max)}`,detail);
 const name=s.name;
 const unlock=(active:boolean,detail:string)=>cap(active?1:0,1,detail);
 if(name==='Box of Gosh')return cap(ch.postOffice?.boxes?.find((b:any)=>b.name==='Box_of_Gosh')?.level,800,'Box levels. Max bonus: +18%.');
 if(name.startsWith('Achievement '))return unlock(s.value>0,'Achievement completed.');
 if(name==='Divinity skill mastery')return unlock(s.value>0,`Rift 15 + mastery rank ${metric==='points'?2:1}.`);
 if(name==='Purrmep major link')return unlock(s.value>1,'Purrmep link active.');
 if(name==='King Doot · Pet Mart+')return unlock(s.value>1,'Upgraded King Doot.');
 if(name==='Sushi reward 47')return unlock(s.value>1,'Unlock at 47 unique sushi.');
 if(name==='God Rank')return note(`Rank ${f(kid.rank)}`,'+10% per rank.');
 if(name==='Divinity gem-shop purchase')return note(`${f(a.gemShopPurchases?.[130])} purchases`,'+0.25x per purchase.');
 const ids:any={'Coral Kid · Volcano Link':0,'Coral Kid · Reef Devotion':4,'Singularity · Transmutation':6,'Singularity · Divinity EXP':8};
 if(name in ids){const id=ids[name],u=kid.upgrades[id];return note(`Level ${f(u.level)}`,u.next===null||(id===4&&kid.reefLevels===null)?'Next bonus unavailable.':`Next level: ${f(1+(id===4?kid.reefLevels:1)*u.next/100)}x.`);}
 if(name.endsWith(' blessing')){const id:any={Snehebatu:0,Arctis:1,Harriep:3,Omniphau:5}[name.split(' ')[0]],g=a.divinity?.deities?.[id];return cap(g?.level,g?.maxLevel,'Blessing levels; cap can increase.');}
 if(name==='Ashen Urn'){const tier=Number(a.sailing?.artifacts?.[11]?.acquired)||0;return cap(tier,7,`Artifact tier. Counts up to class level ${200*tier}.`);}
 if(name==='Jade Rock'){const count=Number(a.looty?.rawLootedItems)||0;return cap(count,510+10*Math.floor(Math.max(0,count-500)/10),'Slab items to next bonus step.');}
 if(name.startsWith('Upgrade Vault')){const u=a.upgradeVault?.upgrades?.[metric==='points'?71:72];return cap(u?.level,u?.maxLevel,u?.level>0?`Levels. Max bonus: +${f(s.value*u.maxLevel/u.level)}%.`:'Levels; cap can increase.');}
 if(name.startsWith('Legend talent')){const t=a.legendTalents?.talents?.find((t:any)=>t.originalIndex===(name.includes('all skill')?20:15));return cap(t?.level,t?.maxLevel,'Talent levels; cap can increase.');}
 if(name==='World 5 merit')return cap(Number(a.tasks?.[2]?.[4]?.[4])||0,5,'Merit levels. Max bonus: +50%.');
 if(name==='Divinity EXP card')return cap(s.value/6,7,'Card bonus levels. Max bonus: +42%.');
 if(name==='Pious at Heart')return note('300% base limit','Diminishing returns; amplifiers apply.');
 if(name==='Polytheism · shared points bonus')return note(`${f(s.value)}x / 1.7x`,'Diminishing-return limit.');
 if(name==='Shared Beliefs')return note(`${f(s.value)}x / 2x`,'Diminishing-return limit.');
 if(name==='Guild skill EXP')return cap(a.guild?.guildBonuses?.[14]?.level,200,'Guild levels. Max bonus: +18.75%.');
 if(name==='Divinity EXP vial'){const vial=a.alchemy?.vials?.find((v:any)=>v.name==='MAPLE_SYRUP');return cap(vial?.level,13,'Vial levels. Base max: +26%.');}
 if(name==='Div Spiral sigil'){const sigil=a.alchemy?.p2w?.sigils?.find((s:any)=>s.name==='DIV_SPIRAL');return cap(sigil?sigil.unlocked+1:null,5,'Sigil tiers; highest is Eclectic.');}
 if(name==='All-skill EXP companion')return cap(s.value<=1?0:s.value>=2.5?2:1,2,'Companion tier. Upgraded: 2.5x.');
 if(name==='Divinity EXP companion')return cap(s.value<=1?0:s.value>=2?2:1,2,'Companion tier. Upgraded: 2x.');
 if(name===String((bribes as any)[38]?.name||'Divinity bribe').replaceAll('_',' '))return unlock(s.value>0,'Bribe purchased.');
 const descriptions:any={
  'Lamp · Divinity points':'+10% base per wish.',
  'Divinity EXP stamp':'Scales with stamp levels and boosts.',
  'Divinity statue':'Scales with statue levels and boosts.',
  'Divinity EXP meals':'Scales with meal levels and boosts.',
  'Inner Peace':'+1% per effective talent level.',
  'Divinity EXP star sign':'Depends on active sign and boosts.',
  'Arcade · Divinity EXP':'Tier boosts: level 101 = 2x; 102 = 6x.',
  'Equipment · Divinity EXP':'Depends on equipped gear.',
  'Divinity weekly vote':'Depends on active vote and boosts.',
  'Magma armor set':'Depends on set unlock and boosts.',
  'Meritocracy · all skill EXP':'Requires the all-skill EXP selection.'
 };
 return note('Variable',descriptions[name]||'Maximum depends on account upgrades.');
}

function divinityMaximum(s:any,metric:string,a:any,ch:any,kid:any){
 const n=s.name;
 if(n==='Box of Gosh')return 18;
 if(n.startsWith('Achievement '))return 10;
 if(n==='Divinity skill mastery')return metric==='points'?15:25;
 if(n===String((bribes as any)[38]?.name||'Divinity bribe').replaceAll('_',' '))return Number(a.bribes?.[38]?.value)||null;
 if(n.startsWith('Upgrade Vault')){const u=a.upgradeVault?.upgrades?.[metric==='points'?71:72];return u&&Number.isFinite(u.maxLevel)?u.maxLevel*u.x5*(1+Number(getUpgradeVaultBonus(a.upgradeVault.upgrades,89)||0)/100):null;}
 if(n==='Purrmep major link')return 2;
 if(n==='King Doot · Pet Mart+')return 1.25;
 if(n==='Sushi reward 47')return s.value>1?s.value:null;
 if(n.endsWith(' blessing')){const id:any={Snehebatu:0,Arctis:1,Harriep:3,Omniphau:5}[n.split(' ')[0]],g=a.divinity?.deities?.[id];return Number.isFinite(g?.maxLevel)?1+g.maxLevel*({0:2,1:3,3:3,5:4} as any)[id]*(1+.05*(isJadeBonusUnlocked(a,'True_Godly_Blessings')?1:0)*Number(kid.rank||0))/100:null;}
 if(n==='Ashen Urn')return 1+2*Number(a.sailing?.artifacts?.[11]?.acquired||0);
 if(n.startsWith('Legend talent')){const t=a.legendTalents?.talents?.find((t:any)=>t.originalIndex===(n.includes('all skill')?20:15));return t?1+t.maxLevel*t.x2/100:null;}
 if(n==='Pious at Heart'){const b=a.alchemy?.bubblesFlat?.find((b:any)=>b.bubbleName==='PIOUS_AT_HEART');return b?.level>0&&s.value>0?s.value*(b.level+100)/b.level:null;}
 if(n==='World 5 merit')return 50;
 if(n==='Divinity EXP card')return 42;
 if(n==='Guild skill EXP')return 18.75;
 if(n==='Divinity EXP vial'){const v=a.alchemy?.vials?.find((v:any)=>v.name==='MAPLE_SYRUP');return v?.level>0?s.value*13/v.level:null;}
 if(n==='Div Spiral sigil')return a.alchemy?.p2w?.sigils?.find((v:any)=>v.name==='DIV_SPIRAL')?.eclecticBonus??null;
 if(n==='All-skill EXP companion')return 2.5;
 if(n==='Divinity EXP companion')return 2;
 if(n==='Polytheism · shared points bonus')return 1.7;
 if(n==='Shared Beliefs')return 2;
 return null;
}

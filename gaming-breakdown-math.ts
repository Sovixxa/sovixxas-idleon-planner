import {addNuggetBreakdown} from './gaming-nuggets';
import {addGamingLimits} from './gaming-bonus-limits';
import {getBitsMulti, getPaletteBonus, getPaletteLuck} from './vendor/idleon-toolbox/parsers/world-5/gaming';
import {getMinorDivinityBonus} from './vendor/idleon-toolbox/parsers/world-5/divinity';
import {getBestActiveCharacter, getHighestTalentAcrossCharacters, getTalentBonus} from './vendor/idleon-toolbox/parsers/talents';
import {getBubbleBonus, getVialsBonusByStat} from './vendor/idleon-toolbox/parsers/world-2/alchemy';
import {getMealsBonusByEffectOrStat} from './vendor/idleon-toolbox/parsers/world-4/cooking';
import {getStampsBonusByEffect} from './vendor/idleon-toolbox/parsers/world-1/stamps';
import {isMasteryBonusUnlocked} from './vendor/idleon-toolbox/parsers/misc';
import {getGuildBonusBonus} from './vendor/idleon-toolbox/parsers/guild';
import {getUpgradeVaultBonus} from './vendor/idleon-toolbox/parsers/misc/upgradeVault';
import {getSushiBonus} from './vendor/idleon-toolbox/parsers/world-7/sushiStation';

const parse = (v:any) => typeof v === 'string' ? JSON.parse(v) : v;
const row = (name:string,value:number,unit='×',detail=unit==='×'?'Multiplies separately.':'Adds to this total.') => ({name,value,unit,detail});
const fmt=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:2});
const product = (rows:any[]) => rows.reduce((v,r)=>v*r.value,1);
export function getGamingBreakdown(account:any,characters:any[],raw:any){
 const g=parse(raw.Gaming), s=parse(raw.GamingSprout), a=account, gaming=a.gaming;
 const active=getBestActiveCharacter(characters)||characters[0];
 const level=active?.skillsInfo?.gaming?.level||0;
 const sources=getBitsMulti(a,characters).breakdown.categories[0].sources;
 const bits=sources.filter(r=>!['Meals','Ooz Ooblek (vial)','Logbook & Log Game & Rat King'].includes(r.name)).map(r=>row(r.name,r.value));
 const bitDetails:any={
  'Bit Toggle':'Gaming bit toggle: 100× bits while enabled, with 100× longer growth intervals.',
  'Research Grid':'Research Gaming Bits upgrade. 1 + boosted Research bonus / 100.',
  'Gummy Orb Artifact':'Sailing · Gummy Orb. 1 + its current artifact bonus / 100.',
  'Weatherbook Artifact':'Sailing · Weatherbook. 1 + its current artifact bonus / 100.',
  'Companion':'Gaming bit companion. Uses the active owned or upgraded companion bonus.',
  'Monument':'Hole · Bravery Monument Gaming Bits reward, including monument boosts.',
  'Skill Mastery':'Rift · Gaming Skill Mastery. 1.15× when the bit reward is unlocked.',
  'MSA Totalizer':'Worship · MSA Totalizer Gaming Bits reward from tower-defense progress.',
  'Snail':`Gaming · Snail Lv ${gaming.snailLevel}. 2× per level up to 25, then 1.5× per level up to 50.`,
  'Card (Boomy Mine)':'Cards · passive Boomy Mine Gaming Bit multiplier.',
  'Acorn':'Gaming · Squirrel bit upgrade. 1 + 8 × level / (250 + level); approaches 9×.',
  'Best Nugget':'Gaming · Shovel. Your best gold nugget, with a minimum of 1×.',
  'Elegant Shell':'Gaming · Elegant Shell. 1 + shell rank × import bonus / 100.',
  'Rocky Boba (vial)':'Alchemy · Rocky Boba. Separate multiplier including vial boosts.',
  'Poing Multi':'Gaming · Pong score. 1 + square root of high score / 100, capped at 25×.',
  'Achievements':'Gaming achievement rewards: +5% each, up to 1.10× together.',
  'Summoning':'Summoning · Gaming Bits winner reward, including winner-reward boosts.',
  'Lamp':'Hole · Lamp Gaming Bits wish bonus.',
  'Emperor':'Sneaking · Emperor Gaming Bits reward.',
  'Palette 7':'Gaming · first bit-gain palette colour, including palette effect boosts.',
  'Palette 18':'Gaming · second bit-gain palette colour, including palette effect boosts.',
  'Meritocracy':'Summoning · Gaming Bits Meritocracy bonus.',
  'Sticker':'Farming · Gaming Bits sticker, including sticker boosts.',
  'Vault Upgrade':'Upgrade Vault · Gaming Bits upgrade, including Vault boosts.',
  'Sushi Station':'Sushi Station · Gaming Bits rest-of-game reward.'
 };
 bits.forEach(r=>{r.detail=bitDetails[r.name]||r.detail;});
 bits.find(r=>r.name==='Companion')!.name='Koi Fish companion';
 bits.find(r=>r.name==='Palette 7')!.name='DJ Musto palette';
 bits.find(r=>r.name==='Palette 18')!.name='Offwhite palette';
 // The parser's display breakdown omits /100 for Research and splits an additive pool.
 bits.find(r=>r.name==='Research Grid')!.value=1+(sources.find(r=>r.name==='Research Grid')!.value-1)/100;
 bits.find(r=>r.name==='Bitty Litty Talent')!.value=1+(getHighestTalentAcrossCharacters(characters,'BITTY_LITTY',active)||0)*level/100;
 bits.find(r=>r.name==='Bitty Litty Talent')!.detail=`Bitty Litty bonus × saved active character's Gaming level (${level}), then 1 + percentage / 100.`;
 const meals=getMealsBonusByEffectOrStat(a,null,'GamingBits'),vial=getVialsBonusByStat(a.alchemy?.vials,'GameBits');
 bits.push(row('Meals + Ooz Ooblek',1+(meals+vial)/100,'×',`Cooking meals +${fmt(meals)}% and Alchemy Ooz Ooblek +${fmt(vial)}% add before multiplying: 1 + (meals + vial) / 100.`));
 const entries=gaming.logBook.filter((r:any)=>r.unlocked).length;
 const bubble=getBubbleBonus(a,'BIT_BY_BIT',false)||0;
 bits.push(row('Logbook + Bit by Bit',Math.max(1,1.08**entries+bubble*entries/100),'×',`${entries} entries. 1.08^entries + Bit by Bit bonus × entries / 100; minimum 1×.`));
 bits.push(row('Log game',Math.max(1,1.2**((a.accountOptions?.[497]||0)-1)),'×','1.2^(Log game level − 1), minimum 1×.'));
 const crowns=gaming.ratKing?.crownsCount||0;
 bits.push(row('Rat King crowns',Math.max(1,1.13**crowns+Math.min(10,crowns)+.5*Math.max(0,crowns-10)),'×',`${crowns} crowns. 1.13^crowns + first 10 crowns + half the remaining crowns.`));
 const base=(1+4*g[1])*1.065**g[1], kitsune=s[29]?.[1]||0;
 const achievementCount=a.achievements?.filter((x:any)=>x.completed).length||0;
 const achievementBits=gaming.superbitsUpgrades?.[0]?.unlocked?1.03**achievementCount:1;
 const harvest=[row('Sprout Value upgrade',base,' bits',`Level ${g[1]}. (1 + 4 × level) × 1.065^level.`),row('Account bit multiplier',product(bits)),row('Kitsune harvest penalty',1/(1+2*kitsune),'×',`Kitsune ${kitsune?'enabled: one-third harvest value':'disabled: full harvest value'}.`),row('Achievement superbit',achievementBits,'×',`1.03 per completed achievement when unlocked; ${achievementCount} completed.`)];
 const acorn=(3*(s[27]?.[3]||0))**.8;
 const purr=characters.find((c:any)=>c.linkedDeity===6);
 const god=getMinorDivinityBonus(purr,a,6,characters)||0;
 const speed=[row('Sprout Speed',1+2*g[2]/100,'×',`Level ${g[2]}; +2% per level.`),row('Chartreuse palette',1+getPaletteBonus(a,8)/100),row('Minty Blue palette',1+getPaletteBonus(a,11)/100),row('Acorn shop + Purrmep',1+(acorn+god)/100,'×',`Acorn shop +${fmt(acorn)}% and Divinity Purrmep +${fmt(god)}% add before multiplying.`),row('Kitsune growth',1+(3+(s[29]?.[0]||0)/100)*kitsune,'×',`Kitsune ${kitsune?'enabled':'disabled'}; enabled speed factor is 4 + import level / 100.`)];
 const toggle=1+99*(a.accountOptions?.[411]||0), interval=5000*toggle/product(speed);
 speed.unshift(row('Base interval',5000,' s','Time between growth rolls before bonuses.'),row('Bit toggle time cost',toggle,'×','Multiplies the interval, rather than speed. Also multiplies bit gains.'));
 const mutation=.13+.11*g[7]/(150+g[7]);
 const crop=Math.max(1,a.farming?.cropDepot?.gamingEvo?.value||1);
 const chance=Math.min(1,mutation*crop);
 const growth=[row('Mutation upgrade',mutation*100,'%',`Level ${g[7]}. 13% + 11% × level / (150 + level).`),row('Crop Scientist',crop,'×','Gaming evolution reward from discovered crops and Crop Scientist boosts. Requires Science Pen.'),row('First-stage chance',chance*100,'%','Mutation chance × Crop Scientist, capped at 100%. Later stages have lower odds.')];
 const luck=getPaletteLuck(gaming.paletteFinalBonus||0,gaming.ratKing,a,[active]);
 const luckRaw=luck.breakdown.categories[0].sources;
 const additive=luckRaw.slice(4).map(r=>row(r.name,r.value,'%', 'Adds to the Palette Luck percentage pool.'));
 const luckFactors=luckRaw.slice(0,4).map((r,i)=>row(r.name,1+r.value/(i===0||i===3?1:100)));
 luckFactors.push(row('Sushi Station',1+getSushiBonus(a,42)/100));
 const luckPool=1+additive.reduce((n,r)=>n+r.value,0)/100;
 const exp=[row('Stamps',getStampsBonusByEffect(a,'Gaming_EXP_Gain'),'%'),row('Meals',getMealsBonusByEffectOrStat(a,null,'GamingExp'),'%'),row('Vial',getVialsBonusByStat(a.alchemy?.vials,'GameXP'),'%'),row('1000 Hours Played',getHighestTalentAcrossCharacters(characters,'1000_HOURS_PLAYED',active)||0,'%'),row('Tempestuous Emotions',getTalentBonus(active?.flatTalents,'TEMPESTUOUS_EMOTIONS')||0,'%'),row('W3 merit',10*(a.tasks?.[2]?.[4]?.[4]||0),'%'),row('Skill Mastery',25*Number(isMasteryBonusUnlocked(a.rift,a.totalSkillsLevels?.gaming?.rank,0)||0),'%'),row('Guild',getGuildBonusBonus(a.guild?.guildBonuses,14)||0,'%'),row('Upgrade Vault',getUpgradeVaultBonus(a.upgradeVault?.upgrades,69)||0,'%')];
 exp.forEach(r=>r.detail='Adds to the Gaming EXP percentage pool.');
 return addNuggetBreakdown(addGamingLimits({character:active?.name||'Saved active character',characterLevel:level,groups:[
  {id:'bits',name:'Bit multiplier',value:product(bits),unit:'×',note:'Account bonuses multiply together. Select a source for details.',rows:bits},
  {id:'harvest',name:'Base harvest',value:product(harvest),unit:' bits',note:'Before plant type and evolution. Most plants gain 3× per stage; Cactus gains 4×. Bonsai, Voraci and Evergreen add 3×, 2× and 7×; Chemical is random.',rows:harvest},
  {id:'speed',name:'Growth roll interval',value:interval,unit:' s',note:'5,000 seconds × bit-toggle cost ÷ all speed factors. This is a growth roll, not guaranteed growth.',rows:speed},
  {id:'growth',name:'First-stage growth',value:interval/chance,unit:' s average',note:'Average interval ÷ first-stage chance. Later evolutions take longer.',rows:growth},
  {id:'capacity',name:'Garden capacity',value:Math.min(24,3+g[3]+(a.gemShopPurchases?.[133]||0)),unit:' plants',note:'Base + upgrade + gem shop, capped at 24.',rows:[row('Base capacity',3,' plants'),row('Capacity upgrade',g[3],' plants'),row('Gem shop',a.gemShopPurchases?.[133]||0,' plants')]},
  {id:'luck',name:'Palette Luck',value:luckPool*product(luckFactors),unit:'×',note:'Percentage bonuses add into one pool; the other factors multiply separately. Individual colour odds also depend on its level and plant evolution.',rows:[...additive,row('Combined percentage pool',luckPool),...luckFactors]},
  {id:'exp',name:'Gaming EXP bonus',value:exp.reduce((v,r)=>v+r.value,0),unit:'%',note:'Gaming-specific bonuses for the saved active character; general skill EXP modifiers are separate.',rows:exp}
 ]},a,raw),a,raw);
}

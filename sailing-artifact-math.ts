import {getBoatArtifactChance,getAncientChances,getEldritchChances,getSovereignChances,getOmnipotentChances,getTranscendentChances} from './vendor/idleon-toolbox/parsers/world-5/sailing';
import {isCompanionBonusActive,getEventShopBonus} from './vendor/idleon-toolbox/parsers/misc';
import {getSushiBonus} from './vendor/idleon-toolbox/parsers/world-7/sushiStation';
import {getLegendTalentBonus} from './vendor/idleon-toolbox/parsers/world-7/legendTalents';
import {getResearchGridBonusInternal} from './vendor/idleon-toolbox/parsers/world-7/research';
import {calcUpgradeVaultBonus} from './vendor/idleon-toolbox/parsers/misc/upgradeVault';
import {getVialMultiplier} from './vendor/idleon-toolbox/parsers/world-2/alchemy';
import {getMeritocracyBonus} from './vendor/idleon-toolbox/parsers/world-2/voteBallot';
import {getGrimoireBonus} from './vendor/idleon-toolbox/parsers/class-specific/grimoire';
import {getArmorSetBonus} from './vendor/idleon-toolbox/parsers/world-3/armorSmithy';
import {getMonumentMultiplier} from './vendor/idleon-toolbox/parsers/world-5/caverns/bravery';
import {isJadeBonusUnlocked} from './vendor/idleon-toolbox/parsers/world-6/sneaking';
import {islands} from './vendor/idleon-toolbox/data/website-data';

const parse=(v:any)=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const number=(n:any)=>n!==null&&n!==undefined&&Number.isFinite(Number(n))?Number(n):null;
// Stable probability calculation: do not round a tiny chance up to 0.01%.
export function sailingChestChance(raw:any,artifacts:any[],a:any){
 const [treasure,islandIndex,power]=raw,island=islands[islandIndex];if(!island)return null;
 const count=(x:any)=>x.name==='The_Edge'&&isJadeBonusUnlocked(a,'Brighter_Lighthouse_Bulb')?4:x.numberOfArtifacts;
 const start=islands.slice(0,islandIndex).reduce((n:number,x:any)=>n+count(x),0),vars=a.serverVars||{};
 const thresholds=[0,getAncientChances(islandIndex,vars),getEldritchChances(islandIndex,vars),getSovereignChances(islandIndex,vars),getOmnipotentChances(islandIndex,vars),getTranscendentChances(islandIndex,vars)];
 const unlocked=[true,true,(a.rift?.[0]||0)>29,isJadeBonusUnlocked(a,'Sovereign_Artifacts'),(a.spelunking?.cavesUnlocked||0)>=1,(a.research?.gridSquares?.[109]?.level||0)>0];
 const targets=artifacts.slice(start,start+count(island)).filter(x=>unlocked[x.acquired||0]).map(x=>{const threshold=x.acquired?thresholds[x.acquired]:x.baseFindChance;return {name:x.name.replaceAll('_',' '),tier:(x.acquired||0)+1,chance:Number.isFinite(threshold)&&threshold>0?Math.max(0,Math.min(1,power/threshold)):null};});
 const known=targets.every(x=>x.chance!==null),chance=!known?null:targets.some(x=>x.chance===1)?100:-100*Math.expm1(targets.reduce((n,x)=>n+Math.log1p(-x.chance!),0));
 return {island:island.name.replaceAll('_',' '),chance:targets.length?chance:0,done:!targets.length,targets,treasure};
}

export function getSailingArtifactData(a:any,characters:any[],data:any){
 const artifacts=a.sailing?.artifacts||[],rawCaptains=parse(data.Captains)||[],rawBoats=parse(data.Boats)||[],sailing=parse(data.Sailing)||[];
 const enders=rawCaptains.slice(0,30).filter((x:any)=>Number(x[0])===6).length;
 const research=parse(data.Research)||[],jelly=Number(research[7]?.[9]||0)>19?1.2:1;
 const gridMax=(id:number)=>{const gridLevels=[...(research[0]||[])];gridLevels[id]=a.research?.gridSquares?.[id]?.maxLv||1;return getResearchGridBonusInternal(a,{...a.research,gridLevels,gridObservationIndex:research[1]||[]},id,0);};
 const vault=a.upgradeVault?.upgrades||[],maxVault=vault.map((v:any,i:number)=>i===63?{...v,level:v.maxLevel}:v);
 const highestSailing=Math.max(0,...characters.map(x=>x.skillsInfo?.sailing?.level||0));
 const labEntry=a.lab?.labBonuses?.find((x:any)=>x.index===14),labActive=!!labEntry?.active;
 const allTranscendent=artifacts.length>0&&artifacts.every((x:any)=>x.acquired>=6);
 // Use the decoded Lab value. Its catalog advertises a completion bonus but the
 // bundled MainframeBonus calculation has no verified completion override.
 const lab=1+(labActive?(labEntry?.bonusOn||0):(labEntry?.bonusOff||0))/100;
 const borrowed=String(a.accountOptions?.[606]||'').split(',').includes('27');
 const arcadeDouble=(borrowed?1:isCompanionBonusActive(a,27)?a.companions?.list?.[27]?.bonus:0)===1?2:1;
 const loreMulti=1+((getGrimoireBonus(a.grimoire?.upgrades,17)||0)+(getArmorSetBonus(a,'TROLL_SET')||0))/100;
 const paletteMulti=(1+(getLegendTalentBonus(a,10)||0)/100)*(1+(a.spelunking?.loreBosses?.[8]?.defeated?0.5:0));
 const caps:any[]=[6*highestSailing,null,750,null,20,20,50*101/201*2*arcadeDouble,60*101/201*2*arcadeDouble,null,null,gridMax(109),calcUpgradeVaultBonus(maxVault,63),1+1.5*(1+getMeritocracyBonus(a,22)/100),3,2,1+gridMax(106)/100,1+52*getVialMultiplier(a).value/100,null,null,400,60,3,1.5,1+loreMulti,1.4,1+(a.voteBallot?.bonuses?.[20]?.bonus||0)/100,1.5,1+5*getMonumentMultiplier({holesObject:a.hole?.holesObject,t:1}),1.3,1+3*paletteMulti,Math.pow(1.02,a.spelunking?.discoveriesCount||0),1.3,1.2,null];
 const notes:any={0:'Tier 6 at your Sailing level',1:'No fixed cap',3:'Keeps growing with shiny levels',6:'Super upgrade; current companion',7:'Super upgrade; current companion',8:'Keeps growing with notes',9:'Keeps growing with stickers',10:'Max grid level; current boosts',11:`Your cap: Lv ${vault[63]?.maxLevel??'?'}`,12:'Seraph + doubled sign; current merits',14:'Soft limit; never quite reaches 2×',15:'Max grid level; current boosts',16:'Lv 13; current vial boosts',17:'Event limit not verified',18:'More victories and reward boosts',22:allTranscendent?'Completion bonus not verified; decoded Lab value used':'Normal connected bonus',23:'Soft limit; current Lore boosts',25:'If this ballot is active',27:'Current monument boosts',28:'Soft limit',29:'Soft limit; current palette boosts',30:'At your current discovery count',33:'Keeps growing with presses'};
 const boats=rawBoats.slice(0,Math.min(30,Number(sailing[2]?.[1]||0)+1)).map((b:any,index:number)=>{
  const raw=rawCaptains[b[0]],captain=raw?{level:raw[3],firstBonusIndex:raw[1],secondBonusIndex:raw[2],firstBonusValue:raw[5],secondBonusValue:raw[6]}:null;
  const calc=getBoatArtifactChance(artifacts,captain,a,characters,b[3]||0,b[5]||0),source=Object.fromEntries(calc.breakdown.categories.flatMap((c:any)=>c.sources).map((s:any)=>[s.name,s.value]));
  const v=(name:string)=>source[name];
  const values=[v('Fauxory Tusk'),v('Captain'),25*enders,v('Shiny Pet'),v('Fractal Island'),v('Bribe - Artifact Pilfering'),a.arcade?.shop?.[32]?.bonus||0,a.arcade?.shop?.[66]?.bonus||0,v('Hole - Tune of Artifaction'),v('Sticker'),v('Research Grid'),v('Vault Upgrade'),v('Star Sign - Artifosho'),v('Companion - Glimbo'),v('Killroy Bonus'),v('The Maw (Grid 106)'),v('Vial - Turtle Tisane'),v('Purple Chest Slugs'),v('Summoning - Win Bonus'),50*(a.gemShopPurchases?.[8]||0),getLegendTalentBonus(a,11)||0,(b[3]+b[5]>=400&&(a.research?.gridSquares?.[105]?.level||0)>0)?3:1,lab,v('Lore Episode 3'),v('Sneaking - Glowing Veil'),v('Summoning - Vote Bonus'),v('Companion - Litterfish'),v('Monument'),v('Exotic Market'),v('Palette Bonus'),v('Spelunking Discoveries'),1+getSushiBonus(a,7)/100,jelly,1+(a.button?.bonuses?.[3]?.value||0)/100].map(number);
  const additive=values.slice(0,12).reduce((n,x)=>n+(x??0),0),davey=1+((values[19]??0)+(values[20]??0))/100;
  const multipliers=values.filter((x,i)=>i>=12&&i!==19&&i!==20);
  const total=values.some(x=>x===null)?null:Math.max(1,1+additive/100)*davey*multipliers.reduce((n,x)=>n*x!,1);
  return {index,captain:b[0],island:islands[b[1]]?.name.replaceAll('_',' ')||'Harbor',total,additive,davey,values};
 });
 const chests=(parse(data.SailChests)||[]).map((x:any)=>sailingChestChance(x,artifacts,a)).filter(Boolean);
 return {boats,caps:caps.map(number),notes,chests,enders,slugCount:getEventShopBonus(a,48),savedAt:Number(parse(data.TimeAway)?.GlobalTime||0)*1000};
}

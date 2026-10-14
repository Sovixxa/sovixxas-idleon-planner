// Gathering formulas transcribed from the supplied client: SkillStats,
// HourlyKillRate, ChanceToHarvest and FishingToolkit. No resource multi-drop in EXP.
import {getAllEff,getAllBaseSkillEff} from './vendor/idleon-toolbox/parsers/efficiency';
import {getTalentBonus,getMaestroHand,mainStatMap} from './vendor/idleon-toolbox/parsers/talents';
import {getStatsFromGear,calculateItemTotalAmount} from './vendor/idleon-toolbox/parsers/items';
import {getObolsBonus} from './vendor/idleon-toolbox/parsers/obols';
import {getBubbleBonus,getVialsBonusByStat} from './vendor/idleon-toolbox/parsers/world-2/alchemy';
import {getStatueBonus} from './vendor/idleon-toolbox/parsers/world-1/statues';
import {getStampsBonusByStat} from './vendor/idleon-toolbox/parsers/world-1/stamps';
import {getStarSignBonus} from './vendor/idleon-toolbox/parsers/starSigns';
import {getPostOfficeBonus} from './vendor/idleon-toolbox/parsers/world-3/postoffice';
import {getCardBonusByEffect} from './vendor/idleon-toolbox/parsers/cards';
import {getFoodBonus,getGoldenFoodBonus,isMasteryBonusUnlocked} from './vendor/idleon-toolbox/parsers/misc';
import {getLabBonus} from './vendor/idleon-toolbox/parsers/world-4/lab';
import {getVoteBonus} from './vendor/idleon-toolbox/parsers/world-2/voteBallot';
import {getArmorSetBonus} from './vendor/idleon-toolbox/parsers/world-3/armorSmithy';
import {getMonumentBonus} from './vendor/idleon-toolbox/parsers/world-5/caverns/bravery';
import {getAchievementStatus} from './vendor/idleon-toolbox/parsers/achievements';
import {getAtomBonus} from './vendor/idleon-toolbox/parsers/world-3/atomCollider';
import {getBribeBonus} from './vendor/idleon-toolbox/parsers/world-1/bribes';
import {getKangarooBonus} from './vendor/idleon-toolbox/parsers/world-2/kangaroo';
import {getAfkGain,getSkillExpMulti} from './vendor/idleon-toolbox/parsers/character';
import {lavaLog} from './vendor/idleon-toolbox/utility/helpers';
import {bonuses,monsters,mapNames} from './vendor/idleon-toolbox/data/website-data';
import pools from './afk-fish-pools.json';
const configs:any={1:{name:'mining',prefix:'Mining',type:'MINING',tool:0,stat:'strength',bubble:'W',statue:2,card:24,speedCard:34,stamp:'BaseMinEff',po:'MinEffPct',sign:'Mining_Efficency',vial:'MinEff'},3:{name:'chopping',prefix:'Choppin',type:'CHOPPIN',tool:1,stat:'wisdom',bubble:'M',statue:6,card:27,speedCard:37,stamp:'BaseChopEff',po:'ChopEffPct',sign:'Chop_Efficiency',vial:'ChopEff'},4:{name:'fishing',prefix:'Fishing',type:'FISHING',tool:2,stat:'strength',bubble:'W',statue:8,card:30,speedCard:45,stamp:'BaseFishEff',po:'FishEffPct',sign:'Fishin_Efficency',vial:'FishEff'},6:{name:'catching',prefix:'Catching',type:'CATCHING',tool:3,stat:'agility',bubble:'A',statue:9,card:32,speedCard:75,stamp:'BaseCatchEff',po:'CatchEffPct',sign:'Catch_Efficiency',vial:'CatchEff'}};
export function harvestChance(eff:number,defence:number){const ratio=eff/defence;return ratio>=.25?Math.min(1,1.512*(ratio-.0763)/(ratio+5)):0;}
export function gatheringSpeed(skill:number,level:number,toolSpeed:number,bonus:number,eff:number){
 const lv=.9*Math.sqrt(level)/(Math.sqrt(level)+250)+.6*level/(level+40);
 let base=5.7+(toolSpeed<3?(4-toolSpeed)**2.2:-.2*toolSpeed**1.3)-lv;
 if(skill===4)base-=Math.min(eff/(eff+300)*1.7,.8)+Math.min(eff/(eff+1000)*2,1.7);
 return skill===1||skill===3?Math.max(base/(1+bonus/100),.57):Math.max(base,.57)*(skill===4?15:2)/(1+bonus/100);
}
export function gatheringActions(skill:number,speed:number,chance:number,attack:number){
 if(skill===1&&chance<=.05)return 0;
 return Math.round(3600/(speed+.4)*(skill===4?1:chance)*(skill===1||skill===4?Math.max(1,Math.min(3,attack)):1)/(skill===1||skill===3?1.15:1));
}
export function fishingPercentages(eff:number,requirements:number[],depth:number[]){
 const d=depth.map((v,i)=>i?Math.max(0,v-depth[0]/3):v);
 const p4=eff>=requirements[2]?Math.floor(3*eff/(eff+800)*(4*d[3]/(d[3]+100)+1)*100)/100:0;
 const p3=eff>=requirements[1]?Math.floor(100*(2*eff/(eff+200)*6*(2*d[2]/(d[2]+100)+1)-p4/5))/100:0;
 const p2=eff>=requirements[0]?Math.floor(100*(1.5*eff/(eff+10)*20*(2*d[1]/(d[1]+100)+1)-(p3/3+p4/5)))/100:0;
 return [Math.floor(100*(100-(p2+(p3+p4))))/100,p2,p3,p4];
}
export function getGatheringRates(ch:any,characters:any[],account:any,playerInfo:any,raw:any){
 const talentList=[...(ch.flatTalents||[]),...(ch.flatStarTalents||[])];
 const talent=(index:number,y=false)=>{const t=talentList.find(t=>Number(t.skillIndex)===index);return t?getTalentBonus(talentList,t.name,y):0;};
 const gear=(index:number)=>(getStatsFromGear(ch,index,account).value||0)+getObolsBonus(ch.obols,bonuses.etcBonuses[index]);
 const bubble=(stat:string)=>{const b=account.alchemy?.bubblesFlat?.find((b:any)=>b.stat===stat);if(!b)return 0;return getBubbleBonus(account,b.bubbleName,false,mainStatMap[ch.class]===({power:'strength',quicc:'agility',highIQ:'wisdom'} as any)[b.cauldron]);};
 const po=(stat:string)=>{for(const b of ch.postOffice?.boxes||[]){const i=b.upgrades.findIndex((u:any)=>u.stat===stat);if(i>=0)return getPostOfficeBonus(ch.postOffice,b.name,i);}return 0;};
 const stamp=(stat:string)=>getStampsBonusByStat(account,stat,ch)||0;
 const star=(name:string)=>getStarSignBonus(ch,account,name)||0;
 const ach=(i:number)=>getAchievementStatus(account.achievements,i)||0;
 const owned=(rawName:string)=>calculateItemTotalAmount([...(account.storage?.list||[]),...(ch.inventory||[])],rawName,true,true)||0;
 const allEff=getAllEff(ch,characters,account),allBase=getAllBaseSkillEff(ch,account,characters,playerInfo);
 const atom=getAtomBonus(account,'Helium_-_Talent_Power_Stacker')||0;
 const result:any={};
 for(const [idString,cfg] of Object.entries(configs) as any){
  const id=Number(idString),level=ch.skillsInfo?.[cfg.name]?.level;
  if(!(level>0))continue;
  const tool=ch.tools?.[cfg.tool],wp=Number(tool?.Weapon_Power||0),toolSpeed=Number(tool?.Speed??0);
  const mastery=(index:number)=>isMasteryBonusUnlocked(account.rift,account.totalSkillsLevels?.[cfg.name]?.rank,index)||0;
  const card=(index:number)=>getCardBonusByEffect(mastery(2)?account.cards:ch.cards?.equippedCards,bonuses.cardBonuses[index])||0;
  const vial=getVialsBonusByStat(account.alchemy?.vials,cfg.vial)||0;
  const right=getMaestroHand(ch,cfg.name,characters,account,'RIGHT_HAND_OF_ACTION')||0;
  const monument=id===4?0:getMonumentBonus({holesObject:account.hole?.holesObject,t:id===1?0:id===3?2:1,i:0})||0;
  const b=cfg.bubble,slab=bubble(b+'2')*Math.floor((account.looty?.rawLootedItems||0)/100);
  const endgame=bubble(b+(b==='A'?'8':'7'))*Math.max(1,Math.floor((ch.level-500)/10));
  const power=wp+getStatueBonus(account,cfg.statue,ch.flatTalents)+slab+endgame;
  const kit=(field:string)=>(ch.fishingKit?.bait?.[field]||0)+(ch.fishingKit?.line?.[field]||0);
  let base=wp*(1+(id===1?talent(103)*level/10:0)/100)*(1+bubble('Tool'+b)/100)+(id===1||id===3?4:3)+power;
  if(id===4)base+=kit('pow')+Math.min(account.highscores?.minigameHighscores?.find((s:any)=>s.name==='fishing')?.score||0,talent(116,true));
  const st=Number(ch.stats?.[cfg.stat]),strengthen=talent(id===3?532:id===6?367:142),boosted=st*(1+(id===3?talent(462):id===6?talent(296):0)/100);
  let eff=0;
  const post=1+(po(cfg.po)+right+(id===3||id===6?star(cfg.sign):0))/100;
  if(id===1)eff=12+(base**1.3+(st+1)**.6*(1+strengthen/100)+stamp(cfg.stamp)+allBase)*(1+level/200)*post*(1+(st/100)**.35*(1+strengthen/100))*(1+getGoldenFoodBonus('Golden_Peanut',ch,account,characters)/100)*(1+(talent(85)+gear(10)+10*mastery(1)+getVoteBonus(account,7)+getArmorSetBonus(account,'COPPER_SET'))/100)*(1+(card(24)+star(cfg.sign)+vial+monument)/100)*(1+base/100)*(1+bubble('MinEff')*lavaLog(playerInfo.maxHp)/100)*(1+talent(101)*(atom+lavaLog(owned('Copper')))/100)*allEff;
  if(id===3)eff=8+(base**1.3+((st+2)*(1+talent(462)/100)*(1+strengthen/100))**.6+stamp(cfg.stamp)+allBase)*(1+level/200)*post*(1+(bubble('ChopEff')+monument)/100)*(1+(boosted/100)**.35*(1+strengthen/100))*(1+(talent(445)+gear(11)+10*mastery(1)+getVoteBonus(account,9)+getArmorSetBonus(account,'COPPER_SET'))/100)*(1+(card(27)+vial+10*ach(352))/100)*(1+base/100)*(1+talent(461)*lavaLog(owned('Leaf1'))/100)*allEff;
  if(id===4)eff=(base**1.3+st**.6*(1+strengthen/100)+stamp(cfg.stamp)+allBase)*(1+level/200)*(1+(st/100)**.35*(1+(strengthen+10*mastery(1)+getVoteBonus(account,8)+getArmorSetBonus(account,'PLATINUM_SET')+15*getBribeBonus(account.bribes,'Fishermaster')+stamp('FishEffPerLv')*level)/100))*post*(1+base/100)*allEff*(1+getGoldenFoodBonus('Golden_Ribs',ch,account,characters)/100)*(1+(card(30)+vial+gear(19)+(getKangarooBonus(account.kangaroo?.bonuses,'Fishing Eff')||0))/100)*(1+talent(85)/100)*(1+star(cfg.sign)/100);
  if(id===6)eff=(base**1.3+boosted**.6*(1+strengthen/100)+stamp(cfg.stamp)+allBase)*(1+level/200)*(1+(boosted/100)**.35*(1+strengthen/100))*(1+(card(32)+vial+monument+10*mastery(1)+getVoteBonus(account,10)+getArmorSetBonus(account,'PLATINUM_SET')+gear(18)+10*ach(351))/100)*post*(1+talent(295)*(atom+lavaLog(owned('OakTree')))/100)*(1+(base+Math.min(5,5*ach(74)))/100)*allEff*(1+talent(263)/100);
  const speedBonus=getFoodBonus(ch,account,cfg.prefix+'SpeedBoosts')+card(cfg.speedCard)+talent(637)+gear(61)+Math.round((getLabBonus(account.lab?.labBonuses,112)||0)/20)+(id===4?kit('speed'):id===6?Math.min(5,5*ach(113)):0);
  const speed=gatheringSpeed(id,level,toolSpeed,speedBonus,eff);
  const attack=(ch.talentsLoadout||[]).reduce((v:number,t:any)=>t.AFKactivity===id&&t.D!==1?v*(t.D||1)*(1+Math.min(1,t.baseLevel/(t.baseLevel+100))):v,1)*(1+Math.min(talent(624),25)/100);

  const multi=getSkillExpMulti(cfg.name,ch,characters,account,playerInfo).value;
  const nodes:any[]=[],afkCache=new Map<number,number>();
  for(const [key,node] of Object.entries(monsters) as any){
   if(node.AFKtype!==cfg.type||key.startsWith('Motherlode'))continue;
   const nodeMap=ch.targetMonster===key?Number(ch.mapIndex):Number.isFinite(node.mapIndex)?node.mapIndex:null;
   const fish=(pools as any)[key];if(id===4&&!fish)continue;
   const spots=id===4&&[54,55,61].includes(nodeMap)?(nodeMap===54?[0,1]:[0,1,2]):[0];
   for(const spot of spots){
    let xp=Number(node.ExpGiven),chance=harvestChance(eff,Number(node.Defence));
    if(fish){const boost:any=nodeMap===54?[[0,25,5,0],[30,5,0,0]]:nodeMap===55?[[0,0,0,40],[0,0,15,30],[0,0,35,0]]:nodeMap===61?[[0,0,0,70],[0,0,0,54],[0,0,45,0]]:[[0,0,0,0]];
     const depth=[0,1,2,3].map(i=>kit('depth'+(i+1))+(boost[spot]?.[i]||0)+(i?gear(11+i):0));
     const pct=fishingPercentages(eff,fish[3].map(Number),depth);xp=pct.reduce((sum,v,i)=>sum+Math.max(0,v)/100*Number(fish[1][i]),0);chance=1;}
    const mapForBonus=nodeMap??Number(ch.mapIndex);
    if(!afkCache.has(mapForBonus))afkCache.set(mapForBonus,getAfkGain({...ch,afkType:cfg.type,mapIndex:mapForBonus,currentMap:mapNames[mapForBonus]},characters,account).afkGains);
    const afk=afkCache.get(mapForBonus)!;
    const actions=gatheringActions(id,speed,chance,attack),rate=actions*afk*xp*multi;
    if(!Number.isFinite(rate)||rate<0)throw Error('Invalid '+cfg.name+' rate');
    nodes.push({id:key+':'+spot,target:key,map:nodeMap,activity:key,label:String(node.Name||key).replace(/_/g,' ')+(nodeMap!==null?' — '+String(mapNames[nodeMap]||nodeMap).replace(/_/g,' '):'')+(spots.length>1?' · spot '+(spot+1):''),rate,efficiency:eff,harvestChance:chance,speed,actions,afk,multiplier:multi,spot});
   }
  }
  result[id]={nodes};
 }
 return result;
}

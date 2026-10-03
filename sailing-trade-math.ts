import LavaRand from './vendor/idleon-toolbox/utility/lavaRand';
import {islands} from './vendor/idleon-toolbox/data/website-data';
import {getSigilBonus} from './vendor/idleon-toolbox/parsers/world-2/alchemy';
import {getHighestTalentAcrossCharacters,getBestActiveCharacter} from './vendor/idleon-toolbox/parsers/talents';
import {getLegendTalentBonus} from './vendor/idleon-toolbox/parsers/world-7/legendTalents';
import {getLampBonus} from './vendor/idleon-toolbox/parsers/world-5/caverns/the-lamp';
import {getFountainBonusTotal} from './vendor/idleon-toolbox/parsers/world-5/caverns/the-fountain';
import {getSushiBonus} from './vendor/idleon-toolbox/parsers/world-7/sushiStation';
const parse=(v:any)=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
export function getSailingTradeContext(a:any,characters:any[],data:any,now:number){
 const s=parse(data.Sailing),boats=parse(data.Boats)||[],captains=parse(data.Captains)||[],boat=boats[0],cap=captains[boat?.[0]];
 if(!s||!boat)return {missing:true};
 const L=Number(boat[3]||0),speed=Number(boat[5]||0),artifact=(name:string)=>a.sailing?.artifacts?.find((x:any)=>x.name===name&&x.acquired)?.bonus||0;
 const enders=captains.slice(0,30).filter((x:any)=>x[0]===6).length;
 const captainLoot=(cap?.[1]===1?cap[3]*cap[5]:0)+(cap?.[2]===1?cap[3]*cap[6]:0);
 const pool=(getSigilBonus(a.alchemy?.p2w?.sigils,'LOOT_PILE')||0)+captainLoot+artifact('Genie_Lamp')+25*enders+(a.arcade?.shop?.[33]?.bonus||0)+(a.upgradeVault?.upgrades?.[67]?.bonus||0);
 const talent=getHighestTalentAcrossCharacters(characters,'UNENDING_LOOT_SEARCH',getBestActiveCharacter(characters))||0;
 const dj=(1+(50*(a.gemShopPurchases?.[8]||0)+(getLegendTalentBonus(a,11)||0))/100)*(L+speed>=400&&a.research?.gridSquares?.[105]?.level>0?3:1);
 // Game Sailing("BoatValue", 0, 0), not the next-level preview (mode 6).
 const floor=(5+(2+Math.floor(L/8)**2)*L)*(1+pool/100)*(1+talent/100)*dj*(1+(getLampBonus({holesObject:a.hole?.holesObject,t:1,i:0,account:a})||0)/100)*(1+getSushiBonus(a,57)/100)*(1+(getFountainBonusTotal(a.hole?.holesObject,0,17)||0)/100);
 const unlocked=s[0].slice(0,15).filter((x:any)=>x===-1).length,tier=Number(s[3]?.[7]||0),seed=Math.floor(now/21600000);
 const offers=Array.from({length:40},(_,i)=>{const rng=new LavaRand(seed+i),lootIndex=Math.max(1,Math.min(30,Math.ceil(2*rng.rand()*unlocked))),islandIndex=Math.floor((lootIndex-1)/2);
  const rate=1.5*1.6**Math.floor(lootIndex/2)*(1+(((lootIndex+1)%2)*150+30*Math.floor(tier/2)+30*Math.floor(tier/3))/100);
  return {lootIndex,islandIndex,island:islands[islandIndex]?.name.replaceAll('_',' '),rarity:lootIndex%2?'Common':'Rare',stock:Number(s[1]?.[lootIndex]||0),rate,start:(seed+i)*21600000,end:(seed+i+1)*21600000};});
 return {floor,offers,unlocked,emeraldTier:tier,completed:a.achievements?.[300]?.completed??false,achievementKnown:!!parse(data.AchieveReg),savedAt:Number(parse(data.TimeAway)?.GlobalTime||0)*1000,generatedAt:now};
}

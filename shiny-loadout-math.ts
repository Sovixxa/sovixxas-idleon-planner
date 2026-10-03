import {getShinyChance} from './vendor/idleon-toolbox/parsers/world-3/traps';
import {getPrayerBonusAndCurse} from './vendor/idleon-toolbox/parsers/world-3/prayers';
import {getCardSets,calcCardBonus} from './vendor/idleon-toolbox/parsers/cards';
import {getLegendTalentBonus} from './vendor/idleon-toolbox/parsers/world-7/legendTalents';
import {isMasteryBonusUnlocked} from './vendor/idleon-toolbox/parsers/misc';
import {getBubbleBonus} from './vendor/idleon-toolbox/parsers/world-2/alchemy';
import {getCharacterGalleryBonuses} from './vendor/idleon-toolbox/parsers/world-7/gallery';

const label=(v:any)=>String(v||'').replaceAll('_',' ');
const qty=(item:any)=>Number(item?.amount??1);
const trapTier=(item:any)=>Math.min(6,Math.max(0,Number(item?.ID||0)-1));
export function getShinyLoadoutData(parsed:any){
 const {account,characters}=parsed;
 const allItems=[...(account.storage?.list||[]),...characters.flatMap((c:any)=>[...(c.inventory||[]),...(c.tools||[]),...(c.equipment||[]),...(c.food||[])])].filter((i:any)=>i&&qty(i)>0);
 const food=allItems.find((i:any)=>i.rawName==='FoodTrapping1');
 const foodStock=allItems.filter((i:any)=>i.rawName==='FoodTrapping1').reduce((s:number,i:any)=>s+qty(i),0);
 const cards=Object.values(account.cards||{}) as any[];
 const passive=!!isMasteryBonusUnlocked(account.rift,account.totalSkillsLevels?.trapping?.rank,2);
 const relevant=cards.filter(c=>c.effect?.includes('Shiny_Critter_Chance')||c.cardIndex==='Y5');
 const owned=relevant.filter(c=>c.amount>0);
 const prayer=account.prayers?.find((p:any)=>p.name==='Shiny_Snitch');
 const star=account.starSigns?.find((s:any)=>s.starName==='Mount_Eaterest');
 const set=(getCardSets(account) as any).Yum_Yum_Desert;
 // Native card menu: 4 + GemItemsPurchased[63], capped at eight positions.
 const cardSlots=Math.min(8,Math.max(4,Math.round(4+Number(account.gemShopPurchases?.[63]||0))));
 const legend=1+getLegendTalentBonus(account,21)/100;
 const chipPool=(account.lab?.chips||[]).filter((c:any)=>[15,16,20,21].includes(c.index)&&c.totalAmount>0);
 const galleryInput={Spelunk:JSON.stringify(account.gallery?.rawSpelunk??null)};
 const stock:any={};
 for(const [location,list] of [['storage',account.storage?.list||[]],['inventory',characters.flatMap((c:any)=>c.inventory||[])]] as any[]){
  for(const item of list)if(/^Critter\d+A?$/.test(item?.rawName)&&Number(item.amount)>=0){
   stock[item.rawName]??={storage:0,inventory:0};stock[item.rawName][location]+=Number(item.amount);
  }
 }
 const candidates:any[]=[];
 const roster=characters.map((character:any)=>{
  const ch={...character,food:(character.food||[]).filter((f:any)=>qty(f)>0)};
  const current=getShinyChance(ch,account),s=current.sources;
  const placement=(1+(s.stampBonus+s.taskBonus)/100)*s.bubbleMulti*(1+s.vialsBonus/100)*s.talentMulti;
  // Do not borrow an equipped box from another owner: that could invalidate their slot count.
  const tools=[...(account.storage?.list||[]),...(ch.inventory||[]),...(ch.tools||[])].filter((i:any)=>i&&qty(i)>0&&i.Type==='TRAP_BOX_SET'&&Number(i.lvReqToEquip||0)<=Number(ch.skillsInfo?.trapping?.level||0));
  const tool=tools.sort((a:any,b:any)=>trapTier(b)-trapTier(a))[0];
  const equippedTool=ch.tools?.find((i:any)=>i.Type==='TRAP_BOX_SET');
  const hunt=Array.from({length:10},(_,i)=>({quest:i+2,done:Number(ch.questComplete?.['Lord_of_the_Hunt'+(i+2)])>0}));
  const base={id:ch.playerId,name:ch.name,level:s.trappingLevel,placement,sources:s,hunt,huntBaseBonus:hunt.filter(q=>q.done).length,equippedTool:equippedTool?{id:equippedTool.rawName,name:label(equippedTool.displayName)}:null,tool:tool?{id:tool.rawName,name:label(tool.displayName),tier:trapTier(tool)}:null,slots:equippedTool?Number(equippedTool.ID||0)+(getBubbleBonus(account,'CALL_ME_ASH')>0?1:0):0};
  const currentOpening={id:ch.playerId,name:ch.name,open:1+(s.foodBonus+s.cardBonus+s.minigameBonus+s.arcadeBonus)/100,divisor:s.prayerDivider,bundle:current.bundleSize,prayer:'Saved prayers',sources:s,actions:[],food:s.foodBonus>0};
  // Enumerate only already occupied chip slots: never assume extra unlocked slots.
  const existing=(account.lab?.playersChips?.[ch.playerId]||[]).filter((c:any)=>c?.index>=0);
  const slots=existing.length;
  for(const useFood of [false,true]){
   if(useFood&&!food)continue;
   let best:any=null;
   for(let mask=0;mask<2**chipPool.length;mask++){
    const chips=chipPool.filter((_:any,i:number)=>mask&(1<<i));
    if(chips.length>slots)continue;
    const accountCopy={...account,lab:{...account.lab,playersChips:[...(account.lab?.playersChips||[])]}};
    accountCopy.lab.playersChips[ch.playerId]=chips;
    const loadout={...ch,food:useFood?[{...food,amount:1}]:[],cards:{...ch.cards},starSigns:[...(ch.starSigns||[])]};
    // The parsed character caches Gallery bonuses. Chip 16 changes that cache's multiplier.
    if(account.gallery?.rawSpelunk)loadout.gallery=getCharacterGalleryBonuses(galleryInput,accountCopy,loadout);
    if(star?.unlocked&&!star.isInfiniteStar&&!loadout.starSigns.some((s:any)=>s.starName===star.starName))loadout.starSigns=[star];
    const choices=owned.filter(c=>(!passive&&c.effect.includes('Shiny_Critter_Chance'))||(useFood&&c.cardIndex==='Y5'))
     .map(c=>({...c,chipBoost:1,legendBonus:legend})).sort((a,b)=>calcCardBonus(b)*(b.cardIndex==='Y5'?.25:1)-calcCardBonus(a)*(a.cardIndex==='Y5'?.25:1));
    const arranged:any[]=Array.from({length:8},()=>({}));
    const doubled=[...(chips.some((c:any)=>c.index===20)?[0]:[]),...(cardSlots===8&&chips.some((c:any)=>c.index===21)?[7]:[])];
    const order=[...doubled,...Array.from({length:cardSlots},(_,i)=>i).filter(i=>!doubled.includes(i))];
    choices.slice(0,cardSlots).forEach((card,i)=>{arranged[order[i]]={...card,chipBoost:doubled.includes(order[i])?2:1};});
    loadout.cards.equippedCards=arranged;
    if(useFood&&set?.stars>=0)loadout.cards.cardSet={...set,bonus:set.bonus*(set.stars+1)};
    const result=getShinyChance(loadout,accountCopy),src=result.sources;
    const open=1+(src.foodBonus+src.cardBonus+src.minigameBonus+src.arcadeBonus)/100;
    const actions=[`Collect on ${ch.name}`,useFood?'Equip Critter Numnums; keep the food slot stocked':'No consumable food required',
     ...arranged.flatMap((c:any,i:number)=>c.rawName?[`Card slot ${i+1}: ${label(c.displayName)}${c.chipBoost===2?' (doubled)':''}`]:[]),
     ...(useFood&&set?.stars>=0?[`Card set: Yum Yum Desert (+${set.bonus*(set.stars+1)}% food effect)`]:[]),
     ...(useFood&&star?.unlocked?[star.isInfiniteStar?'Mount Eaterest is already passive':'Activate Mount Eaterest']:[]),
     ...chips.map((c:any)=>`Chip: ${label(c.name)}${existing.some((e:any)=>e.index===c.index)?' (already equipped)':' (move an owned copy)'}`)];
    if(!best||open>best.open+1e-10||(Math.abs(open-best.open)<1e-10&&chips.length<best.chipCount))best={id:ch.playerId,name:ch.name,open,sources:src,actions,food:useFood,chipCount:chips.length};
   }
   if(!best)continue;
   const variants=[{prayers:[],name:'No prayers / passive bonuses'},...(prayer?.level>0?[{prayers:[prayer],name:`Shiny Snitch Lv ${prayer.level}`}]:[])];
   for(const v of variants){const bonus=getPrayerBonusAndCurse(v.prayers,'Shiny_Snitch',account);candidates.push({...best,divisor:Math.round(1+bonus.curse),bundle:Math.round((1+bonus.bonus)*(1+s.meritocracyBonus/100)),prayer:v.name,actions:[...best.actions,v.prayers.length?'Equip Shiny Snitch':'Remove all prayers to use any unlocked passive-prayer bonuses']});}
  }
  return {...base,current:currentOpening};
 });
 return {roster,candidates,cardSlots,stock,penPalsScore:Number(account.accountOptions?.[99]||0),foodStock,passive,cards:relevant.map(c=>({name:label(c.displayName),id:c.rawName,owned:c.amount>0,stars:c.stars,bonus:calcCardBonus(c),passive:passive&&c.cardIndex!=='Y5'})),prayer:prayer?{level:prayer.level,max:prayer.maxLevel}:null,star:{owned:!!star?.unlocked,passive:!!star?.isInfiniteStar},chips:chipPool.map((c:any)=>({name:label(c.name),id:c.index})),setBonus:set?.stars>=0?set.bonus*(set.stars+1):0};
}

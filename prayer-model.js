(function(root){
'use strict';
const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{}}return v;};
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const pretty=v=>String(v??'').replaceAll('_',' ');
const goals={
 combat:{label:'Portal / Death Note kills',metric:'kills',unit:'kills/hour',candidates:[4,6,11,13,15,16],combat:true},
 progression:{label:'Class EXP',metric:'exp',unit:'EXP/hour',candidates:[0,2,4,6,11,15],combat:true},
 loot:{label:'Rare drops',metric:'loot',unit:'drop opportunity index',candidates:[4,6,7,11,15],combat:true,relative:true},
 coins:{label:'Coins',metric:'coins',unit:'coin output index',candidates:[4,6,8,11,15],combat:true,relative:true},
 damage:{label:'Maximum damage',metric:'damage',unit:'damage',candidates:[15]},
 skillxp:{label:'All-skill EXP bonus',metric:'skillExp',unit:'%',candidates:[2,17]},
 skilling:{label:'Skill efficiency',metric:'efficiency',unit:'all-skill multiplier',candidates:[1]},
 printing:{label:'Printer sample rate',metric:'sample',unit:'%',candidates:[9]},
 capacity:{label:'Carry capacity',metric:'capacity',unit:'carry multiplier',candidates:[12]},
 trapping:{label:'Shinies from saved traps',metric:'shinies',unit:'expected shinies/collection',candidates:[3]},
 minigame:{label:'Minigame rewards per play',metric:'minigame',unit:'reward multiplier/play',candidates:[10]},
 dungeon:{label:'Dungeon rewards per pass',metric:'dungeon',unit:'reward multiplier/pass',candidates:[14]},
 giants:{label:'Giant spawn chance',metric:'giants',unit:'chance per kill',candidates:[5]},
 crystals:{label:'Crystals from giants',metric:'crystals',unit:'extra crystals/kill',candidates:[5,18]}
};
function slots(raw,M){
 const d=parse(raw.data)||raw,thresholds=M.randomList[9].slice(0,8).map(Number);
 const ids=Object.keys(d).filter(k=>/^CharacterClass_\d+$/.test(k)).map(k=>Number(k.split('_')[1]));
 const highest=ids.filter(id=>[32,34,35].includes(n(parse(d['CharacterClass_'+id])))).reduce((v,id)=>Math.max(v,n(parse(d['Lv0_'+id])?.[0])),0);
 const gems=parse(d.GemItemsPurchased??d.GemItems),gemKnown=Array.isArray(gems)&&gems.length>114;
 const gem=gemKnown?Math.max(0,Math.min(4,n(gems[114]))):null;
 const base=thresholds.filter(x=>highest>=x).length;
 return {base,gem,total:gem===null?null:Math.min(12,base+gem),highestWizard:highest,thresholds};
}
function context(raw,M=root.PrayerMath){
 if(!M)throw new Error('Prayer calculation engine is unavailable.');
 raw=JSON.parse(JSON.stringify(raw));
 const d=parse(raw.data)||raw;
 const levels=parse(d.PrayersUnlocked??d.PrayOwned);
 if(!Array.isArray(levels))throw new Error('Prayer levels are missing from this JSON.');
 const parsed=M.parseData(d,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
 if(!parsed.characters?.length)throw new Error('No characters could be decoded from this JSON.');
 const time=parse(d.TimeAway),stamp=n(time?.GlobalTime)||n(time?.Player);
 const characters=parsed.characters.map(c=>{
   const last=d['PTimeAway_'+c.playerId];
   const savedSeconds=last!==undefined&&stamp?Math.max(0,stamp-n(parse(last))*1000):null;
   const missing=['PVStatList_','CharacterClass_','Lv0_','Prayers_','AFKtarget_'].filter(prefix=>d[prefix+c.playerId]===undefined);
   return {...c,savedSeconds,missing};
 });
 const ctx={raw,d,M,account:parsed.account,characters,slots:slots(raw,M),cache:new Map()};
 ctx.prayers=(parsed.account.prayers||[]).filter(p=>p.level>0&&!/^Some_Prayer|^Some Prayer/.test(p.name));
 const passiveBits=ctx.account.gaming?.superbitsUpgrades?.filter(x=>['No_more_Praying','Prayers_Begone','Prayers_Aint_Meta'].includes(x.name)&&x.unlocked)||[];
 ctx.passive=passiveBits.some(x=>x.name!=='Prayers_Aint_Meta')?passiveBits.length:0;
 return ctx;
}
function targets(ctx){
 const M=ctx.M;
 const areas=Object.entries(M.mapNames).map(([key,name])=>{
  const mapId=Number(key),target=M.mapEnemiesArray[mapId],monster=M.monsters[target];
  return {mapId,name:pretty(name),target,label:pretty(monster?.Name),activity:monster?.AFKtype,world:Math.floor(mapId/50)+1};
 }).filter(x=>x.mapId<350&&x.activity&&x.activity!=='Nothing'&&x.target!=='Z'&&x.target!=='Filler'&&M.mapDetails[x.mapId]?.[1]?.[0]>0&&!/Tutorial|PlayerSelect|Colosseum|Grandfrog|Grandowl|Grandmam|Jungle[XYZ]/i.test(x.name));
 // Dynamic targets (for example a Hole golem) can exist on a map whose default is Nothing.
 for(const ch of ctx.characters){
  const monster=M.monsters[ch.targetMonster];
  if(!areas.some(a=>a.mapId===Number(ch.mapIndex))&&monster&&/fighting/i.test(monster.AFKtype)&&M.mapDetails[ch.mapIndex]?.[1]?.[0]>0){
   areas.push({mapId:Number(ch.mapIndex),name:pretty(M.mapNames[ch.mapIndex]||ch.currentMap),target:ch.targetMonster,label:pretty(monster.Name),activity:monster.AFKtype,world:Math.floor(ch.mapIndex/50)+1});
  }
 }
 areas.sort((a,b)=>a.mapId-b.mapId);
 const critters=ctx.M.getShinyChance(ctx.characters[0],ctx.account).critters.map(c=>({id:c.rawName,name:pretty(c.name),mapId:M.trappingInfo.find(t=>t.critterName===c.rawName)?.mapId}));
 return {areas,critters};
}
function planningContext(ctx,id,goal,options={}){
 if(options.mode!=='plan')return ctx;
 const original=ctx.characters.find(c=>c.playerId===id);
 if(!original)throw new Error('Character not found.');
 const catalog=targets(ctx),spec=goals[goal]||goals.combat;
 const critter=goal==='trapping'?catalog.critters.find(c=>c.id===(options.critter||catalog.critters[0]?.id)):null;
 if(goal==='trapping'&&!critter)throw new Error('Select a supported critter.');
 const mapId=critter?.mapId??options.mapId??original.mapIndex;
 const area=catalog.areas.find(a=>a.mapId===Number(mapId));
 if(!area)throw new Error('Select a supported planning area.');
 if((spec.combat||['giants','crystals'].includes(goal))&&!/fighting/i.test(area.activity))throw new Error('Select a combat area for this target.');
 const key=id+':'+area.mapId+':'+(critter?.id||'');
 ctx.plans??=new Map();if(ctx.plans.has(key))return ctx.plans.get(key);
 const monster=ctx.M.monsters[area.target];
 const ch={...original,mapIndex:area.mapId,currentMap:ctx.M.mapNames[area.mapId],targetMonster:area.target,afkTarget:monster.Name,afkType:monster.AFKtype,monsterFace:monster.MonsterFace,missing:original.missing.filter(x=>x!=='AFKtarget_')};
 const planned={...ctx,characters:ctx.characters.map(c=>c.playerId===id?ch:c),cache:new Map(),planning:{mapId:area.mapId,area:area.name,target:area.label,critter:critter?.id,critterName:critter?.name,savedArea:pretty(original.currentMap),savedTarget:pretty(ctx.M.monsters[original.targetMonster]?.Name||original.targetMonster),activity:area.activity}};
 ctx.plans.set(key,planned);return planned;
}
function evaluate(ctx,id,set,override){
 const ids=[...new Set(set)].sort((a,b)=>a-b),key=id+':'+ids.join(',')+':'+JSON.stringify(override||null);
 if(ctx.cache.has(key))return ctx.cache.get(key);
 const M=ctx.M,original=ctx.characters.find(c=>c.playerId===id);
 if(!original)throw new Error('Character not found in the JSON.');
 const prayers=ctx.account.prayers.map(p=>override&&p.prayerIndex===override.id?{...p,x1:override.mode==='neutral'?0:p.x1,x2:0}:p);
 const account={...ctx.account,prayers};
 const character={...original,activePrayers:ids.map(i=>prayers.find(p=>p.prayerIndex===i)).filter(Boolean)};
 const roster=ctx.characters.map(c=>c.playerId===id?character:c);
 const effect=i=>M.getPrayerBonusAndCurse(character.activePrayers,prayers.find(p=>p.prayerIndex===i)?.name,account);
 const isCombat=/fighting/i.test(character.afkType||'');
 const damage=M.getMaxDamage(character,roster,account);
 const classExp=M.getClassExpMulti(character,account,roster).value;
 const skillExp=M.getAllSkillsExp(character,roster,account).value;
 const rawSample=M.getPrinterSampleRate(character,account,account.charactersLevels);
 const sample=Math.min(90,rawSample);
 const cap=effect(2).curse>2;
 const seconds=character.savedSeconds;
 // Compare the saved interval; never invent a future claim schedule.
 const timeFactor=ctx.planning?1:cap&&seconds===null?null:cap&&seconds>36000?36000/seconds:1;
 const rawKills=damage.killsPerHour*damage.afkGains*damage.survivability/100;
 const monster=M.monsters[character.targetMonster];
 const drop=M.getDropRate(character,account,roster).dropRate;
 const cash=M.getCashMulti(character,account,roster,damage).cashMulti;
 const capacity=M.getAllCap(character,account,false).value;
 const efficiency=M.getAllEff(character,roster,account);
 const shiny=M.getShinyChance(character,account);
 const traps=parse(ctx.d['PldTraps_'+id]);
 const placed=Array.isArray(traps)?traps.filter(t=>Array.isArray(t)&&n(t[0])>=0&&t[3]&&Number.isFinite(Number(t[8]))):[];
 const plannedCritter=ctx.planning?.critter?shiny.critters.find(c=>c.rawName===ctx.planning.critter):null;
 const shinies=plannedCritter?Math.min(1,plannedCritter.chance/100)*shiny.bundleSize:placed.length?placed.reduce((sum,t)=>sum+Math.min(1,Math.max(0,n(t[8]))*(1+n(shiny.sources?.onOpenBonus)/100)/(1+effect(3).curse)/100)*shiny.bundleSize,0):null;
 const minigameBuff=effect(10),playCost=Math.max(1,minigameBuff.curse);
 const star=M.getStarSignBonus(character,account,'minigame_reward');
 const fishing=/fishing/i.test(character.afkType)?M.getTalentBonus(character.flatTalents,"BOBBIN'_BOBBERS"):0;
 const minigameReward=1+(n(star)+n(fishing)+minigameBuff.bonus)/100;
 const plays=n(account.accountOptions?.[33]);
 const dungeonReward=effect(14).bonus>.5?2:1;
 const dungeonCost=override?.id===14&&override.mode==='buff'?1:dungeonReward;
 const giants=effect(5).bonus>5?M.getGiantMobChance(character,account).chance:0;
 const crystals=giants*2*Math.min(1,effect(18).bonus/100);
 const result={
  kills:isCombat&&timeFactor!==null?Math.floor(damage.finalKillsPerHour*timeFactor):null,
  exp:isCombat&&timeFactor!==null?rawKills*classExp*n(monster?.ExpGiven)*timeFactor:null,
  loot:isCombat&&timeFactor!==null?rawKills*drop*timeFactor:null,
  coins:isCombat&&timeFactor!==null?rawKills*cash*timeFactor:null,
  damage:damage.maxDamage,skillExp,efficiency,sample,rawSample,capacity,shinies,
  minigame:ctx.planning||plays>=playCost?minigameReward/playCost:0,dungeon:dungeonReward/dungeonCost,giants,crystals,
  stats:{damage:damage.maxDamage,accuracy:damage.accuracy,hitChance:damage.hitChance,defence:damage.defence,survival:damage.survivability,classExp,skillExp,efficiency,afk:damage.afkGains,capacity,sample,rawSample,monsterHp:n(monster?.MonsterHPTotal)*(1+(effect(0).curse+effect(7).curse+effect(8).curse)/100),drop,cash,cap,playCost,minigameReward,plays,dungeonReward,dungeonCost,giants,shinyBundle:shiny.bundleSize,shinyDivisor:1+effect(3).curse},
  timeFactor,savedSeconds:seconds,isCombat,trapCount:placed.length
 };
 for(const metric of Object.values(goals).map(g=>g.metric))if(result[metric]!==null&&!Number.isFinite(result[metric]))result[metric]=null;
 ctx.cache.set(key,result);return result;
}
const delta=(a,b)=>a===null||b===null?null:a===0?(b===0?0:null):100*(b/a-1);
const better=(a,b)=>a>b+Math.max(Number.MIN_VALUE,Math.max(Math.abs(a),Math.abs(b))*1e-10);
async function analyze(ctx,id=0,goal='combat',progress=()=>{},options={}){
 ctx=planningContext(ctx,id,goal,options);
 const spec=ctx.planning&&goal==='trapping'?{...goals.trapping,label:'Shinies for '+ctx.planning.critterName,unit:'expected shinies per planned trap'}:goals[goal]||goals.combat,ch=ctx.characters.find(c=>c.playerId===id);
 if(!ch)throw new Error('Character not found.');
 if(ch.missing.length)throw new Error('This character is missing JSON fields: '+ch.missing.map(k=>k+id).join(', '));
 if(ctx.slots.total===null)throw new Error('Gem shop purchase data is missing; available prayer slots cannot be calculated.');
 const equipped=ch.activePrayers.map(p=>p.prayerIndex),current=evaluate(ctx,id,equipped),empty=evaluate(ctx,id,[]);
 if(current[spec.metric]===null)throw new Error(spec.combat?'This character is not fighting a supported monster in the saved JSON. Select another character or target.':goal==='trapping'?'No placed traps with saved shiny chances were found for this character.':'The required values for this target could not be calculated from this JSON.');
 let best=[],bestValue=empty[spec.metric],bestResult=empty;
 const candidates=spec.candidates.filter(i=>ctx.prayers.some(p=>p.prayerIndex===i));
 const combinations=1<<candidates.length;
 for(let mask=1;mask<combinations;mask++){
  const set=candidates.filter((_,bit)=>mask&(1<<bit));
  if(set.length>ctx.slots.total)continue;
  const result=evaluate(ctx,id,set),value=result[spec.metric];
  if(value!==null&&(bestValue===null||better(value,bestValue)||(!better(bestValue,value)&&set.length<best.length))){best=set;bestValue=value;bestResult=result;}
  if(mask%8===0){progress({done:mask,total:combinations});await new Promise(r=>setTimeout(r,0));}
 }
 // Compare every prayer at the winning setup, preserving all other prayers.
 const rows=[];
 for(const prayer of ctx.prayers){
  const index=prayer.prayerIndex,without=best.filter(i=>i!==index),withPrayer=[...without,index];
  const before=evaluate(ctx,id,without),after=evaluate(ctx,id,withPrayer);
  const neutral=evaluate(ctx,id,withPrayer,{id:index,mode:'neutral'}),buff=evaluate(ctx,id,withPrayer,{id:index,mode:'buff'});
  const a=before[spec.metric],b=after[spec.metric],chosen=best.includes(index),change=delta(a,b);
  const verdict=chosen?'Use':a===null||b===null?'Cannot calculate':better(a,b)?'Do not use':better(b,a)?'Slot tradeoff':'Not needed';
  const value=base=>Math.round(n(base)*Math.max(1,1+(prayer.level-1)/10));
  rows.push({index,name:pretty(prayer.name),level:prayer.level,chosen,equipped:equipped.includes(index),verdict,change,before:a,after:b,
    buffChange:a&&(buff[spec.metric]!==null&&neutral[spec.metric]!==null)?(buff[spec.metric]-neutral[spec.metric])/a*100:null,
    curseChange:a?(b-buff[spec.metric])/a*100:null,passiveChange:a?(neutral[spec.metric]-a)/a*100:null,
    bonusText:pretty(prayer.effect??prayer.bonus).replaceAll('{',value(prayer.x1)),curseText:pretty(prayer.curse).replaceAll('{',value(prayer.x2)),beforeStats:before.stats,afterStats:after.stats,
    reason:chosen?'In the highest-output setup for this target.':a===null||b===null?'Required values are missing from this JSON; this comparison cannot be calculated.':better(a,b)?'The curse and any lost no-prayer bonuses outweigh the buff for this target.':better(b,a)?'Improves this comparison, but does not fit the winning slot allocation.':'Adds no output for this target; save the slot.',
    notes:index===2&&ctx.planning?'Planning compares hourly output before the 10-hour AFK cap. Unending Energy still stops AFK gains after 10 hours; no future claim time is assumed.':index===2?'Unending Energy alone has a 10-hour AFK cap. The comparison uses the elapsed interval recorded in this JSON; it does not predict your next absence.':index===9?'Sample rate is capped at 90%. Unequipping Royal Sampler requires removing samples. Sample rate is not total sample size.':index===3&&ctx.planning?'Uses the selected critter’s base chance and this character’s placement/opening bonuses, capped at 100%, for one planned trap. Saved traps are not required.':index===3?'Uses each placed trap’s saved shiny chance, the 100% chance cap, bundle size and the game’s (1 + curse) divisor.':index===14?'The client gives 2× rewards for 2× passes: no reward-per-pass gain. Its activation gate also applies to the no-prayer passive bonus.':index===18?'Giant frequency is divided by (1 + curse / 100), not reduced by that percentage directly. Crystal summoning also needs Tachion.':index===10&&ctx.planning?'Compares rewards per play for the planned activity regardless of today’s remaining plays. The plays-per-attempt cost still applies.':index===10?'Includes saved star signs, the fishing talent when relevant, and available daily plays. Rewards are divided by plays consumed.':''});
 }
 rows.sort((a,b)=>Number(b.chosen)-Number(a.chosen)||a.index-b.index);
 return {goal,spec,planning:ctx.planning||null,character:{id,name:ch.name,class:ch.class,map:pretty(ch.currentMap),target:pretty(ctx.M.monsters[ch.targetMonster]?.Name||ch.targetMonster)},slots:ctx.slots,passive:ctx.passive,selected:best,current:equipped,rows,baseline:current[spec.metric],optimized:bestValue,empty:empty[spec.metric],change:delta(current[spec.metric],bestValue),currentStats:current.stats,bestStats:bestResult.stats,savedSeconds:ch.savedSeconds,combinations,notes:goal==='skillxp'?'Optimizes the all-skill EXP bonus pool. Efficiency and its loss are shown separately; this is not a skill EXP/hour simulation.':goal==='skilling'?'Optimizes the all-skill efficiency multiplier. Skill EXP changes are shown separately; this is not a resource/hour simulation.':goal==='printing'?'Optimizes the capped sample-rate component, not total sample size. Saved equipment and talents are held fixed.':goal==='damage'?'Optimizes maximum damage; hit chance and survivability are shown separately.':goal==='loot'?'Compares rare-drop opportunities from kill rate × drop rate. This is not a count of a specific item or multikill-affected material.':goal==='coins'?'Compares kill rate × coin multiplier on the selected monster; the unchanged base coin value cancels in the percentage comparison.':''};
}
function roster(ctx){return ctx.characters.map(c=>({id:c.playerId,name:c.name,mapId:c.mapIndex,activity:pretty(c.afkType),target:pretty(ctx.M.monsters[c.targetMonster]?.Name||c.targetMonster)}));}
const api={context,evaluate,analyze,slots,goals,roster,delta,targets,planningContext};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrayerModel=api;
})(typeof self!=='undefined'?self:globalThis);

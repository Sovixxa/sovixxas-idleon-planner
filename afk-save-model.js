(function(root){
 'use strict';
 const decode=v=>typeof v==='string'?JSON.parse(v):v;
 if(typeof module!=='undefined'&&!root.ConnectedPrimaryStats)require('./connected-primary-stats');
 const names=['character','mining','smithing','chopping','fishing','alchemy','catching','trapping','construction','worship','cooking'];
 const foodEffects={0:['ClassEXP','MoveSpdBoosts','BaseDmgBoosts','WeaponPowerBoosts'],1:['MiningSpeedBoosts'],3:['ChoppinSpeedBoosts'],4:['FishingSpeedBoosts'],6:['CatchingSpeedBoosts']};
 function foodSlots(data,id){
  const saved=Number(data['FoodSlO_'+id]);
  if(Number.isFinite(saved)&&saved>=0)return Math.min(16,Math.floor(saved));
  const gems=decode(data.GemItemsPurchased)||[],tasks=decode(data.Tasks)||[];
  return Math.min(16,Math.max(2,Math.round(2+Number(gems[59]||0)+Math.floor(Number(tasks[2]?.[2]?.[0]||0)/2))));
 }
 function prepare(raw,M,options={}){
  const copy=JSON.parse(JSON.stringify(raw)),data=decode(copy.data)||copy;
  copy.serverVars=decode(copy.serverVars||data.serverVars)||{};
  if(typeof options.statueWeek==='boolean'){
   const categories=[...(copy.serverVars.voteCat2||[])];
   if(options.statueWeek)categories[0]=26;
   else if(Number(categories[0])===26)categories[0]=-1;
   copy.serverVars.voteCat2=categories;
  }
  for(const key of Object.keys(data).filter(k=>/^Lv0_\d+$/.test(k))){
   const id=Number(key.slice(4)),order=decode(data['EquipOrder_'+id]),qty=decode(data['EquipQTY_'+id]);
   if(options.activeBuffs===false)data['BuffsActive_'+id]=[];
   if(options.prayers===false)data['Prayers_'+id]=[];
   if(!order?.[2]||!qty?.[2])continue;
   const slots=foodSlots(data,id);let choices=options.boostFoods?options.foods?.[id]:null;
   if(options.boostFoods&&Array.isArray(options.sharedFoods)){
    const selected=[...new Set(options.sharedFoods)],allowed=foodEffects[options.skill]||[];
    if(selected.length>slots)throw Error('Selected boost foods exceed a character’s unlocked food slots.');
    if(selected.some(id=>M.stampItemCatalog?.[id]?.Type!=='BOOST_FOOD'||!allowed.includes(M.stampItemCatalog[id].Effect)))throw Error('Invalid boost food for the selected skill.');
    const planned=Array.from({length:slots},(_,slot)=>Number(qty[2][slot])>0?order[2][slot]||'Blank':'Blank');
    for(let slot=0;slot<slots;slot++)if(allowed.includes(M.stampItemCatalog?.[planned[slot]]?.Effect)&&!selected.includes(planned[slot]))planned[slot]='Blank';
    for(const food of selected){if(planned.includes(food))continue;let slot=planned.indexOf('Blank');if(slot<0)slot=planned.findLastIndex(id=>!selected.includes(id));planned[slot]=food;}
    choices=Object.fromEntries(planned.flatMap((food,slot)=>food===order[2][slot]&&Number(qty[2][slot])>0?[]:[[slot,food]]));
   }
   for(let slot=0;slot<16;slot++){
    const selected=choices?.[slot],item=M.stampItemCatalog?.[selected];
    // Ignore retired health-potion simulations restored from older browser preferences.
    if(slot<slots&&selected!==undefined&&item?.Effect!=='HpBaseBoosts'){
     if(selected!=='Blank'&&!(item?.Type==='BOOST_FOOD'&&(foodEffects[options.skill]||[]).includes(item.Effect)))throw Error('Invalid boost food for the selected skill.');
     order[2][slot]=selected;qty[2][slot]=selected==='Blank'?0:1;
    }
    // Native TotalFoodBonuses only visits owned slots with nonzero quantities.
    if(slot>=slots||!(Number(qty[2][slot])>0))order[2][slot]='Blank';
   }
   data['EquipOrder_'+id]=order;data['EquipQTY_'+id]=qty;
  }
  return {copy,data};
 }
 function combatMaps(ch,characters,account,M){
  const pretty=v=>String(v||'').replace(/_/g,' '),nodes=[];
  for(const [key,name] of Object.entries(M.mapNames||{})){
   const map=Number(key),savedCombat=map===Number(ch.mapIndex)&&/fighting/i.test(M.monsters[ch.targetMonster]?.AFKtype),target=savedCombat?ch.targetMonster:M.mapEnemiesArray?.[map],monster=M.monsters[target];
   if(map>=350||[39,40,70,71,118,119].includes(map)||!M.mapDetails?.[map]?.[1]?.[0]||!/fighting/i.test(monster?.AFKtype)||!(Number(monster.ExpGiven)>0)||/Tutorial|PlayerSelect|Colosseum|Grandfrog|Grandowl|Grandmam|Jungle[XYZ]/i.test(name))continue;
   const planned={...ch,mapIndex:map,currentMap:name,targetMonster:target,afkTarget:monster.Name,afkType:monster.AFKtype,monsterFace:monster.MonsterFace},roster=characters.map(c=>c.playerId===ch.playerId?planned:c);
   const node={id:String(map),map,activity:monster.AFKtype,label:`${pretty(name)} · ${pretty(monster.Name||target)}`};
   try{
    const damage=M.getMaxDamage(planned,roster,account),multi=M.getClassExpMulti(planned,account,roster).value;
    const rate=damage.killsPerHour*damage.afkGains*damage.survivability/100*multi*Number(monster.ExpGiven);
    if(Number.isFinite(rate)&&rate>=0){node.rate=rate;node.combat={monsterExp:Number(monster.ExpGiven),expMultiplier:multi,kills:damage.killsPerHour,afk:damage.afkGains,survival:damage.survivability,hit:damage.hitChance,damage:damage.maxDamage};}
   }catch{}
   nodes.push(node);
  }
  return nodes;
 }
 function calculate(raw,M,options={}){
  const {copy,data}=prepare(raw,M,options);
  let parsed;const errors=[],originalError=console.error;
  try{console.error=(...args)=>errors.push(String(args[0]));parsed=M.parseData(data,copy.charNames,copy.companion,copy.guildData,copy.serverVars||{},copy.accountCreateTime,copy.tournament);}finally{console.error=originalError;}
  if(errors.length)throw Error('Some save sections could not be decoded. Import a complete export or enter overrides.');
  const {characters,account}=parsed,result={};
  if(!characters?.length)throw Error('No characters could be decoded.');
  if(M.getStatsFromGear){
   const totals=characters.map(ch=>root.ConnectedPrimaryStats.calculate(ch,account,characters,M,false));
   totals.forEach((stats,i)=>stats.forEach((stat,j)=>{if(stat.unknown.length||!Number.isFinite(stat.computed))throw Error('Could not rebuild primary stats for '+characters[i].name);characters[i].stats[['strength','agility','wisdom','luck'][j]]=stat.computed;}));
  }
  for(const ch of characters){
   const id=ch.playerId,rows=result[id]={};
   let damage;const playerInfo=()=>damage||(damage=M.getMaxDamage(ch,characters,account));
   const missing=['CharacterClass_','PVStatList_','EquipOrder_','Lv0_','Prayers_','CardEquip_'].filter(k=>data[k+id]===undefined);
   let gathering={},gatheringError;
   if(!missing.length&&M.getGatheringRates)try{gathering=M.getGatheringRates(ch,characters,account,playerInfo(),data);}catch(error){gatheringError=error.message;}
   for(let skill=0;skill<=20;skill++){
    const row=rows[skill]={};
    const label=x=>String(x.displayName||x.Name||x.name||x.rawName||'').replace(/_/g,' ');
    row.loadout={equipment:[...(ch.equipment||[]),...(ch.tools||[])].filter(x=>x&&x.rawName!=='Blank').map(label).filter(Boolean),cards:(ch.cards?.equippedCards||[]).map(label).filter(Boolean),cardSet:label(ch.cards?.cardSet||{}),buffs:(ch.activeBuffs||[]).filter(Boolean).map(label),prayers:(ch.activePrayers||[]).map(label),food:(ch.food||[]).filter(x=>x.amount>0&&x.rawName!=='Blank').map(label)};
    row.foodSlots=foodSlots(data,id);
    const originalData=decode(raw.data)||raw,originalFood=decode(originalData['EquipOrder_'+id])?.[2]||{};
    row.savedFoods=Array.from({length:row.foodSlots},(_,slot)=>label(M.stampItemCatalog?.[originalFood[slot]]||{name:originalFood[slot]||'Blank'}));
    row.loadout.starSigns=(ch.starSigns||[]).map(label).filter(Boolean);
    row.loadout.talents=(ch.talentsLoadout||[]).filter(Boolean).map(t=>label(t)+' (level '+(t.level??t.baseLevel??0)+')');
    row.loadout.obols=[...(ch.obols?.list||[]),...(account.obols?.list||[])].filter(x=>x.rawName&&x.rawName!=='Blank').map(label);
    row.foodChoices=Object.entries(M.stampItemCatalog||{}).filter(([,item])=>item.Type==='BOOST_FOOD'&&(foodEffects[skill]||[]).includes(item.Effect)).map(([id,item])=>({id,label:label(item),effect:item.Effect,bonus:item.Amount}));
    if(skill===20&&Number.isFinite(account?.research?.researchEXPrateTOT)&&account.research.researchEXPrateTOT>=0){row.rate=account.research.researchEXPrateTOT;row.rateSource='Calculated from saved Research observations, shapes, insight and EXP bonuses. Excludes extra gains from future tournament registration.';continue;}
    if(missing.length){row.error='Save is missing '+missing.join(', ')+'. Import a complete export or enter an override.';continue;}
    try{
     if([0,1,3,4,6].includes(skill)&&M.getPrayerBonusAndCurse){
      const prayer=account.prayers?.find(p=>p.prayerIndex===2);
      row.candyCap=M.getPrayerBonusAndCurse(ch.activePrayers,prayer?.name,account).curse>2?10:Number.MAX_VALUE;
      if(!M.mapDetails?.[ch.mapIndex]?.[1]?.[0])row.candyBlocked='This saved map has no supported AFK activity for candy. Move to an eligible map and re-import.';
     }
     if(skill<11&&skill!==8){
      const value=skill===0?M.getClassExpMulti(ch,account,characters).value:M.getSkillExpMulti(names[skill],ch,characters,account,skill===10?playerInfo():undefined).value;
      if(Number.isFinite(value)&&value>0){row.multiplier=value;row.multiplierSource='Calculated from saved cards, equipment, talents and account bonuses.';}
     }
     if([1,3,4,6].includes(skill)){
      if(gathering[skill]?.nodes?.length){row.nodes=gathering[skill].nodes;row.defaultNode=row.nodes.find(n=>n.target===ch.targetMonster&&(skill!==4||n.spot===Number(data['PVFishingSpotIndex_'+id]||0)))?.id||row.nodes[0].id;row.candyBlocked=null;}
      else if(gatheringError)row.rateReason='Gathering calculation unavailable: '+gatheringError;
     }
     if(skill===0){
      row.nodes=combatMaps(ch,characters,account,M);row.defaultNode=String(ch.mapIndex);
      const monster=M.monsters[ch.targetMonster];
      if(/fighting/i.test(ch.afkType)&&Number(monster?.ExpGiven)>0&&![39,40,70,71,118,119].includes(Number(ch.mapIndex))){
       const damage=playerInfo();
       const rate=damage.killsPerHour*damage.afkGains*damage.survivability/100*row.multiplier*Number(monster.ExpGiven);
       if(Number.isFinite(rate)&&rate>=0){row.rate=rate;row.rateSource='Calculated for '+String(ch.currentMap||ch.targetMonster).replace(/_/g,' ')+' with the saved loadout; includes AFK gain and survival. Assumes claims within your AFK limit.';}
      }else row.rateReason='The saved activity is not supported combat. Enter the EXP/hour for the combat map you intend to use.';
      if(row.nodes.length&&!row.nodes.some(n=>n.id===row.defaultNode))row.nodes.unshift({id:row.defaultNode,map:ch.mapIndex,activity:ch.afkType,label:'Saved activity · '+String(ch.currentMap||ch.afkType).replace(/_/g,' '),rate:row.rate,candyBlocked:row.candyBlocked});
     }
     if(skill===17){
      const exp=M.getSkillExpMulti('sneaking',ch,characters,account);
      if(Number.isFinite(exp.value)&&exp.value>=0)row.context='Saved floor '+account.sneaking.players[id].floor+': '+exp.value.toLocaleString(undefined,{maximumFractionDigits:2})+' EXP per successful action. The tester does not yet calculate action timing and detection downtime; enter a measured hourly average.';
     }
     if(skill===19){
      row.nodes=M.getSpelunkingRates(ch,characters,account).nodes;
      row.defaultNode=row.nodes.find(n=>n.target===ch.targetMonster)?.id||row.nodes[0]?.id;
      row.context='Calculated AFK gathering EXP. Active cave runs and stamina spending are separate activities.';
     }
    }catch(e){row.error='Could not calculate this stat from the export. You can enter an override.';}
   }
  }
  return result;
 }
 const api={calculate,combatMaps,prepare,foodSlots,foodEffects};if(typeof module!=='undefined')module.exports=api;else root.AfkSaveModel=api;
})(globalThis);

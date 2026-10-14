(function(root){
 'use strict';
 const decode=v=>typeof v==='string'?JSON.parse(v):v;
 const names=['character','mining','smithing','chopping','fishing','alchemy','catching','trapping','construction','worship','cooking'];
 function calculate(raw,M){
  const copy=JSON.parse(JSON.stringify(raw)),data=decode(copy.data)||copy;
  let parsed;const errors=[],originalError=console.error;
  try{console.error=(...args)=>errors.push(String(args[0]));parsed=M.parseData(data,copy.charNames,copy.companion,copy.guildData,copy.serverVars||{},copy.accountCreateTime,copy.tournament);}finally{console.error=originalError;}
  if(errors.length)throw Error('Some save sections could not be decoded. Import a complete export or enter overrides.');
  const {characters,account}=parsed,result={};
  if(!characters?.length)throw Error('No characters could be decoded.');
  for(const ch of characters){
   const id=ch.playerId,rows=result[id]={};
   let damage;const playerInfo=()=>damage||(damage=M.getMaxDamage(ch,characters,account));
   const missing=['CharacterClass_','PVStatList_','EquipOrder_','Lv0_','Prayers_','CardEquip_'].filter(k=>data[k+id]===undefined);
   let gathering={},gatheringError;
   if(!missing.length&&M.getGatheringRates)try{gathering=M.getGatheringRates(ch,characters,account,playerInfo(),data);}catch(error){gatheringError=error.message;}
   for(let skill=0;skill<=20;skill++){
    const row=rows[skill]={};
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
      const monster=M.monsters[ch.targetMonster];
      if(/fighting/i.test(ch.afkType)&&Number(monster?.ExpGiven)>0&&![39,40,70,71,118,119].includes(Number(ch.mapIndex))){
       const damage=playerInfo();
       const rate=damage.killsPerHour*damage.afkGains*damage.survivability/100*row.multiplier*Number(monster.ExpGiven);
       if(Number.isFinite(rate)&&rate>=0){row.rate=rate;row.rateSource='Calculated for '+String(ch.currentMap||ch.targetMonster).replace(/_/g,' ')+' with the saved loadout; includes AFK gain and survival. Assumes claims within your AFK limit.';}
      }else row.rateReason='The saved activity is not supported combat. Enter the EXP/hour for the combat map you intend to use.';
     }
     if(skill===17){
      const exp=M.getSkillExpMulti('sneaking',ch,characters,account);
      if(Number.isFinite(exp.value)&&exp.value>=0)row.context='Saved floor '+account.sneaking.players[id].floor+': '+exp.value.toLocaleString(undefined,{maximumFractionDigits:2})+' EXP per successful action. The tester does not yet calculate action timing and detection downtime; enter a measured hourly average.';
     }
     if(skill===19){
      const exp=M.getSkillExpMulti('spelunking',ch,characters,account);
      if(Number.isFinite(exp.value)&&exp.value>0)row.context='Saved Spelunking EXP multiplier: ×'+exp.value.toLocaleString(undefined,{maximumFractionDigits:2})+'. Hourly EXP also depends on the activity and stamina cycle; the tester does not yet calculate that cycle.';
     }
    }catch(e){row.error='Could not calculate this stat from the export. You can enter an override.';}
   }
  }
  return result;
 }
 const api={calculate};if(typeof module!=='undefined')module.exports=api;else root.AfkSaveModel=api;
})(globalThis);

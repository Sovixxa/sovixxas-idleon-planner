'use strict';
importScripts('prayer-math-engine.js');
onmessage=event=>{try{
 const raw=event.data, data=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
 if(!(data.StampLv||data.StampLevel)||!(data.StampLvM||data.StampLevelMAX))throw Error('Import a complete save with stamp levels and unlocked level caps.');
 const errors=[],original=console.error;let parsed;
 try{console.error=(...args)=>errors.push(String(args[0]));parsed=PrayerMath.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=original;}
 if(errors.length)throw Error('The save could not be fully decoded. Import a fresh complete export.');
 const {account,characters}=parsed;
 const rows=Object.values(account.stamps).flat().map(stamp=>{
  const s=PrayerMath.evaluateStamp(stamp,account,characters,false,undefined,false,false);
  const coin=s.level<s.maxLevel,capacity=s.bestCharacter?.maxCapacity;
  let status=s.level===0?'Not acquired':!Number.isFinite(s.goldCost)||!Number.isFinite(s.materialCost)||!Number.isFinite(capacity)?'Unknown':coin?(s.hasMoney?'Upgradeable now':'Need coins'):!s.enoughPlayerStorage?'Carry blocked':s.materials?.length?'Crafting required':s.hasMaterials?'Upgradeable now':'Need materials';
  return {name:s.displayName.replaceAll('_',' '),id:s.rawName,category:s.category,level:s.level,maxLevel:s.maxLevel,action:coin?'Coin level':'Raise level cap',goldCost:s.goldCost,materialCost:s.materialCost,item:s.itemReq?.name?.replaceAll('_',' '),itemId:s.itemReq?.rawName,owned:s.ownedMats,capacity,perSlot:s.bestCharacter?.capacityPerSlot,character:s.bestCharacter?.character,status};
 });
 postMessage({result:{rows,money:account.currencies.rawMoney}});
}catch(error){postMessage({error:error.message});}};

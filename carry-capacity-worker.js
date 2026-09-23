'use strict';
importScripts('prayer-math-engine.js');
const bags=[['bCraft','Materials','bCraft'],['bOre','Mining','Mining'],['bLog','Chopping','Chopping'],['dFish','Fishing','Fishing'],['dBugs','Catching','Bugs'],['cFood','Food','Foods'],['dCritters','Critters','Critters'],['dSouls','Souls','Souls']];
function buildCarry({account,characters}){
 if(!characters?.length)throw Error('No characters in this export.');
 return {players:characters.map(character=>{
  const slots=character.inventorySlots;
  if(!Number.isFinite(slots)||!character.maxCarryCap)throw Error('Missing inventory capacity data.');
  const audit=[],seen=new Set();
  const add=(scope,name,current,unit,detail)=>{if(!Number.isFinite(current))throw Error('Incomplete capacity source: '+name);audit.push({scope,name,current,unit,detail,status:current<0?'penalty':current?'active':'zero'});};
  const rows=bags.map(([type,name,key])=>{
   const calculation=PrayerMath.getItemCapacity(type,character,account,false);
   const town=PrayerMath.getItemCapacity(type,{...character,mapIndex:0},account,false);
   if(!Number.isFinite(calculation.value)||!Number.isFinite(town.value))throw Error('Incomplete bag calculation.');
   for(const source of calculation.breakdown||[]){
    if(source.value===undefined||source.name==='Base Bag')continue;
    const specific=source.name==='Stamps'||(source.name==='Talent'&&seen.has('Talent')&&name==='Materials');
    // Global talent occurs before the Materials section; Extra Bags occurs after it.
    const materialTalent=source.name==='Talent'&&calculation.breakdown.indexOf(source)>calculation.breakdown.findIndex(row=>row.title==='Materials')&&name==='Materials';
    const scoped=specific||materialTalent, id=(scoped?name:'All')+source.name;
    if(seen.has(id))continue;seen.add(id);if(source.name==='Talent'&&!materialTalent)seen.add('Talent');
    const label=source.name==='Talent'?(materialTalent?'Extra Bags':'Telekinetic Storage'):source.name==='Star Sign'?'Carry-cap star signs (final)':source.name;
    const flat=['Upgrade Vault','Bundle Capacity'].includes(source.name);
    const notes={Guild:'Added to Telekinetic Storage before multiplying.',Talent:materialTalent?'Materials-only multiplier.':'Added to Guild before multiplying.',Shrine:'Saved-map coverage, including shrine card effects and global coverage unlocks.','Ruck Sack prayer':'Includes applicable no-prayer Superbits when no prayers are equipped.','Zerg Rushogen penalty':'Separate multiplier; cannot reduce capacity below ×0.4.','Companion':'Companion 18: separate multiplier.','Companion Lv2':'Upgraded Ram: added to Ruck Sack and bribe.',Bribe:'Added to Ruck Sack and upgraded Ram.','Upgrade Vault':'Upgrade 11; flat capacity added to every bag.','Bundle Capacity':'1,000 base capacity per owned bon_w / bon_x / bon_y bundle.',Gemshop:'25% per purchase; separate multiplier.','All Stamps':'Added to final Carry Cap star-sign bonus before multiplying.',Stamps:'Bag-specific stamp, including character skill scaling.','Star Sign':'Equipped and eligible Infinite Stars; Nanochip and Seraph Cosmos scaling are already included.'};
    add(scoped?name:'All bags',label,source.name==='Gemshop'?source.value*25:source.value,flat?' base':'%',notes[source.name]||'');
   }
   return {type:name,name:name+' bag',base:character.maxCarryCap[key],perSlot:calculation.value,max:calculation.value*slots,townMax:town.value*slots,missing:!character.maxCarryCap[key]};
  });
  const chip=account.lab?.playersChips?.[character.playerId]?.some(c=>c.index===15);
  const infinite=PrayerMath.isRiftBonusUnlocked(account.rift,'Infinite_Stars')?5+(PrayerMath.getShinyBonus(account.breeding?.pets,'Infinite_Star_Signs')??0):0;
  const cosmos=account.starSigns?.some(s=>s.starName==='Seraph_Cosmos'&&s.unlocked);
  const tess=PrayerMath.getTesseractBonus(account,40),merit=PrayerMath.getMeritocracyBonus(account,22);
  const cosmosMulti=cosmos?Math.min(5,Math.pow(1.1+Math.min(tess,10)/100,Math.ceil((character.skillsInfo.summoning.level+1)/20))):1;
  add('Star-sign modifier','Silkrode Nanochip',chip&&(!infinite||cosmos)?2:1,'×',chip?'Equipped; Infinite Stars requires Seraph Cosmos for doubling. Included in final star-sign total.':'Not equipped on this character. Owning an unused chip does not activate it.');
  add('Star-sign modifier','Infinite Stars',infinite,' signs','Only unlocked signs within this range apply automatically.');
  add('Star-sign modifier','Seraph Cosmos',cosmosMulti,'×','Includes Summoning level and Tesseract upgrade 40; capped at ×5. Already included in star-sign total.');
  add('Star-sign modifier','Tesseract 40',tess,'','Input to Seraph Cosmos, capped at 10; not a separate capacity multiplier.');
  add('Star-sign modifier','Meritocracy 22',cosmos?merit:0,'%', 'Applies through unlocked Seraph Cosmos; included in final star-sign total.');
  const contributing=account.starSigns.filter((sign,index)=>sign.unlocked&&(index<infinite||character.starSigns.some(s=>s.starName===sign.starName))&&sign.bonuses.some(b=>b.effect.includes('Carry_Cap')));
  const starRow=audit.find(row=>row.name==='Carry-cap star signs (final)');
  if(starRow)starRow.detail+=' Sources: '+(contributing.map(s=>s.starName.replaceAll('_',' ')).join(', ')||'none')+'.';
  add('All bags','Inventory slots',slots,' slots','Empty-bag theoretical total, not currently free slots.');
  add('All bags','Per-slot hard cap',2050000000,' items','Applied after multipliers and before rounding down.');
  return {playerID:character.playerId,playerName:character.name,class:character.class,capacity:{totalInventorySlots:slots},rows,audit};
 })};
}
onmessage=event=>{try{
 const raw=event.data,data=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
 if(!Object.keys(data).length)throw Error('Import a complete account export.');
 const errors=[],original=console.error;let parsed;
 try{console.error=(...args)=>errors.push(String(args[0]));parsed=PrayerMath.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=original;}
 if(errors.length)throw Error('The save could not be fully decoded. Import a fresh complete export.');
 postMessage({result:buildCarry(parsed)});
}catch(error){postMessage({error:error.message});}};

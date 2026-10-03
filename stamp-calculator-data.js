(function(root){
'use strict';
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
function build(raw,provided){
 const data=parse(raw.data)||raw;
 if(!(data.StampLv||data.StampLevel)||!(data.StampLvM||data.StampLevelMAX))throw Error('Import a complete save with stamp levels and unlocked level caps.');
 const errors=[],original=console.error;let parsed=provided;
 try{console.error=(...args)=>errors.push(String(args[0]));if(!parsed)parsed=PrayerMath.parseData(structuredClone(data),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=original;}
 if(errors.length)throw Error('The save could not be fully decoded. Import a fresh complete export.');
 const {account,characters}=parsed,capacityCache=new Map();
 const rows=Object.values(account.stamps).flat().map(stamp=>{
  const s=PrayerMath.evaluateStamp(stamp,account,characters,false,undefined,false,false),item=PrayerMath.stampItemCatalog[s.itemReq?.rawName];
  const carriers=characters.map(c=>{
   const key=c.playerId+'|'+item?.typeGen+'|'+item?.itemType;
   if(!capacityCache.has(key))capacityCache.set(key,item?.itemType==='Equip'?1:item?PrayerMath.getItemCapacity(item.typeGen,{...c,mapIndex:0},account,false)?.value:null);
   const order=parse(data['InventoryOrder_'+c.playerId]);
   return {name:c.name,slots:Array.isArray(order)?c.inventorySlots:null,inventory:c.inventory?.map(({rawName,slot,amount})=>({rawName,slot,amount})),perSlot:capacityCache.get(key)};
  });
  const effect=PrayerMath.getStampBonus(account,s.category,s.rawName,characters[0]),base=PrayerMath.growth(s.func,s.level,s.x1,s.x2,false);
  const group={combat:0,skills:1,misc:2}[s.category],index=account.stamps[s.category].indexOf(stamp),lv=parse(parse(data.StampLv??data.StampLevel)?.[group])?.[index],max=parse(parse(data.StampLvM??data.StampLevelMAX)?.[group])?.[index];
  const projectedLevel=s.level<s.maxLevel?s.level+1:s.maxLevel+s.reqItemMultiplicationLevel;
  const projectedAccount={...account,stamps:{...account.stamps,[s.category]:account.stamps[s.category].map(entry=>entry.rawName===s.rawName?{...entry,level:projectedLevel}:entry)}};
  const projections=characters.map(c=>({name:c.name,before:PrayerMath.getStampBonus(account,s.category,s.rawName,c),after:PrayerMath.getStampBonus(projectedAccount,s.category,s.rawName,c)})).filter(p=>Number.isFinite(p.before)&&Number.isFinite(p.after));
  return {name:s.displayName.replaceAll('_',' '),id:s.rawName,category:s.category,level:s.level,maxLevel:s.maxLevel,known:lv!==null&&lv!==undefined&&max!==null&&max!==undefined&&typeof lv!=='boolean'&&typeof max!=='boolean'&&Number.isFinite(Number(lv))&&Number(lv)>=0&&Number.isFinite(Number(max))&&Number(max)>=0,
   goldCost:s.goldCost,materialCost:s.materialCost,item:s.itemReq?.name?.replaceAll('_',' '),itemId:s.itemReq?.rawName,owned:s.ownedMats,crafted:item?.itemType==='Equip',carriers,
   func:s.func,x1:s.x1,x2:s.x2,stat:s.stat,skillIndex:s.skillIndex,description:s.effect?.replaceAll('_',' '),interval:s.reqItemMultiplicationLevel,
   projections,projectedLevel,
   characterEffects:characters.map(c=>{const value=PrayerMath.getStampBonus(account,s.category,s.rawName,c);return Number.isFinite(value)?value:null;}),
   // Exact effect thresholds are used only for misc stamps, which have no skill-level penalty.
   effect:Number.isFinite(effect)?effect:null,effectMultiplier:s.category==='misc'&&base>0&&Number.isFinite(effect)?effect/base:null};
 });
 return {rows,money:account.currencies.rawMoney,characters:characters.map(c=>({name:c.name,id:c.playerId}))};
}
root.StampCalculatorData={build};
})(globalThis);

(function(root){
 'use strict';
 const fields={orion:'ownedMegafeathers',poppy:'ownedMegafishes',bubba:'ownedMegaflesh'};
 const call=(obj,name,...args)=>{try{return obj[name]?.(...args)??0;}catch{return 0;}};
 function preview(system,key,amount){
  const field=fields[key],original=system[field];
  try{system[field]=amount;return (system.bonuses||[]).map(x=>({name:x.desc||`Bonus ${Number(x.index)+1}`,value:call(system,'getGlobalBonus',x.index)}));}
  finally{system[field]=original;}
 }
 function snapshot(system,key){
  if(!system)return null;
  const result={},methods={};
  for(const [name,value] of Object.entries(system))if(value===null||['string','number','boolean'].includes(typeof value))result[name]=value;
  for(const name of ['upgrades','tarpitUpgrades','fisherooBonuses','bonuses'])result[name]=(system[name]||[]).map(x=>({index:x.index,level:x.level,level1:x.level1,level2:x.level2,unlocked:x.unlocked,data:x.data,desc:x.desc,value:x.value,realLevel:call(x,'getRealLevel'),productionRequired:call(x,'getMeatProductionRequired')}));
  for(const name of ['getFeatherRate','getFishRate','getMeatSliceRate'])methods[name]=[call(system,name)];
  for(const name of ['getUpgradeCost','getTarpitUpgradeCost','getUpgradeLevel','getFisherooBonus','getMegafeatherQuantity','getMegafishQuantity','getMegafleshQuantity']){
   const count=Math.max(13,result.upgrades.length,result.tarpitUpgrades.length,result.fisherooBonuses.length);
   methods[name]=Array.from({length:count},(_,i)=>call(system,name,i));
  }
  const original=system[fields[key]];
  try{result.multipliers=Array.from({length:13},(_,i)=>{system[fields[key]]=i;return call(system,'getGlobalBonusMulti');});}
  finally{system[fields[key]]=original;}
  result.preview=preview(system,key,original);result.methods=methods;return result;
 }
 function hydrate(data,key){
  if(!data)return null;
  const system={...data};
  for(const name of ['upgrades','tarpitUpgrades','fisherooBonuses','bonuses'])system[name]=data[name].map(x=>({...x,getRealLevel:()=>x.realLevel,getMeatProductionRequired:()=>x.productionRequired}));
  for(const [name,values] of Object.entries(data.methods))system[name]=(index=0)=>values[index]??0;
  system.getGlobalBonusMulti=()=>data.multipliers[system[fields[key]]]??0;
  return system;
 }
 root.ClickerModels={snapshot,hydrate,preview};
})(typeof window!=='undefined'?window:globalThis);

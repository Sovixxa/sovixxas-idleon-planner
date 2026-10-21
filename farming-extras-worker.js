'use strict';
globalThis.window=globalThis;importScripts('prayer-math-engine.js','farming-trade.js','world6-data.js');
onmessage=event=>{try{const raw=event.data,parse=v=>typeof v==='string'?JSON.parse(v):v,data=parse(raw.data)||raw;if(!data.FarmUpg||!data.FarmCrop)throw Error('Load a complete account export containing Farming data.');const errors=[],original=console.error;let parsed;try{console.error=(...args)=>errors.push(String(args[0]));parsed=PrayerMath.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=original;}if(errors.length||!parsed.account?.farming?.stats)throw Error('The account calculation could not decode this export completely. Import a fresh full save.');const f=parsed.account.farming;postMessage({result:JSON.parse(JSON.stringify({farming:f,resetScenarios:buildResetScenarios(parsed.account),harvests:f.plot.filter(p=>p.seedType>=0).map(p=>({index:p.index,cropId:p.cropType,quantity:PrayerMath.getTotalCrop([p],f.market,f.ranks,parsed.account)[p.cropRawName]})),tradeAchievement:parsed.account.achievements?.[364]||null,rotations:PrayerMath.getExoticMarketRotations(parsed.account,2),savedTime:parsed.account.timeAway?.GlobalTime}))});}catch(error){postMessage({error:error.message});}};

function buildResetScenarios(account){
 const f=account.farming;
 const vineSources=f.stats?.cropsOnVine?.categories?.flatMap(c=>c.sources||[])||[];
 const vineBonus=vineSources.reduce((sum,s)=>sum+s.value,0)/100;
 if(!vineSources.length||!Number.isFinite(vineBonus))return [];
 const low=Math.floor(1+vineBonus),fraction=1+vineBonus-low;
 const vines=[{count:low,chance:1-fraction}];
 if(fraction>1e-10)vines.push({count:low+1,chance:fraction});
 const crops=Object.keys(f.crop||{}).filter(k=>/^\d+$/.test(k)).map(Number);
 // Read seed boundaries from the same catalog used by the visible crop model.
 const catalog=typeof WORLD6_CATALOG!=='undefined'?WORLD6_CATALOG:null;
 if(!catalog)return [];
 const seeds=catalog.SeedInfo.map((r,id)=>({id,start:Number(r[2]),end:Number(r[3])}));
 const stock=crops.reduce((sum,id)=>sum+Number(f.crop[id]||0)*FarmingTrade.weight(id,seeds),0);
 const multi=FarmingTrade.multiplier(f);
 const scenarios=[['current','Keep depot and Land Ranks',false,false],['ranks','Reset Land Rank allocations only',false,true],['depot','Trade away depot only',true,false],['both','Trade away depot + reset Land Rank allocations',true,true]];
 return scenarios.map(([id,name,empty,reset])=>{
  const copy=JSON.parse(JSON.stringify(account)),farm=copy.farming;
  if(empty){farm.crop=Object.fromEntries(crops.map(id=>[id,0]));farm.market[14].value=1;farm.market[15].value=1;}
  if(reset)farm.ranks=farm.ranks.map(r=>({...r,bonus:0,upgradeLevel:0}));
  const rows=[],seen=new Set();
  for(const plot of farm.plot.filter(p=>p.seedType>=-1))for(const cropId of crops)for(const vine of vines){
   const cropRawName=`FarmCrop${cropId}.png`;
   const quantity=PrayerMath.getTotalCrop([{...plot,seedType:0,cropRawName,cropQuantity:vine.count,ogMulti:1}],farm.market,farm.ranks,copy)[cropRawName];
   const key=cropId+':'+quantity;
   if(!seen.has(key)&&quantity>0&&Number.isFinite(quantity)){seen.add(key);rows.push({id:cropId,quantity,plot:plot.index,vines:vine.count,chance:vine.chance});}
  }
  const result=FarmingTrade.testHarvests(empty?0:stock,multi,rows,seeds,100000);
  const recipe=result.items?.map(item=>({...rows[item.id],batches:item.quantity,total:rows[item.id].quantity*item.quantity}))||[];
  // A repeatable recipe must not silently cross GMO stock thresholds while harvesting.
  const totals=new Map();for(const r of recipe)totals.set(r.id,(totals.get(r.id)||0)+r.total);
  const changesGMO=[...totals].some(([id,q])=>[10000,100000].some(t=>(empty?0:Number(f.crop[id]||0))<t&&(empty?0:Number(f.crop[id]||0))+q>=t));
  return {id,name,empty,reset,status:changesGMO?'dynamic':result.status,beans:result.beans,recipe,appleYields:[...new Set(rows.filter(r=>r.id===0).map(r=>r.quantity))].sort((a,b)=>a-b),minimumBeans:rows.length?Math.min(...rows.map(r=>Math.sqrt(r.quantity*FarmingTrade.weight(r.id,seeds))*multi)):null,options:rows.length};
 });
}

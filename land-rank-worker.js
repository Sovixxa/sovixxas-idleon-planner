'use strict';
importScripts('prayer-math-engine.js');
let account;
onmessage=({data})=>{try{
 if(data.raw){const raw=data.raw,save=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;account=PrayerMath.parseData(save,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament).account;}
 if(!account?.farming?.ranks?.length)throw Error('Farming ranks could not be decoded.');
 const budget=Math.max(0,Math.min(10000,Math.floor(Number(data.budget)||0)));
 postMessage({id:data.id,plan:PrayerMath.getOptimizedLandRankUpgrades(account,budget,{onlyAffordable:true,weights:data.weights,excluded:data.excluded})});
}catch(error){postMessage({id:data.id,error:error.message});}};

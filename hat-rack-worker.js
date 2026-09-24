'use strict';
importScripts('prayer-math-engine.js');
self.onmessage=({data:raw})=>{
 try{
  const data=raw.data||raw;
  const spelunk=typeof data.Spelunk==='string'?JSON.parse(data.Spelunk):data.Spelunk;
  if(!Array.isArray(spelunk?.[46])){self.postMessage({missing:true});return;}
  const parsed=PrayerMath.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  if(!parsed?.account?.hatRack?.allPremiumHelmets)throw Error('Hat Rack data could not be decoded.');
  self.postMessage({rack:parsed.account.hatRack});
 }catch(error){self.postMessage({error:error.message});}
};

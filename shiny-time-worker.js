'use strict';
importScripts('prayer-math-engine.js');
onmessage=e=>{
 try{
  const raw=e.data,d=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
  const parsed=PrayerMath.parseData(d,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  const characters=parsed.characters.map(c=>({name:c.name,rate:PrayerMath.calcShinyLvMulti(parsed.account,[c]).value}));
  postMessage({characters});
 }catch(error){postMessage({error:error.message});}
};

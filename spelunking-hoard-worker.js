'use strict';
self.window=self;
importScripts('prayer-math-engine.js','world7-data.js');
onmessage=event=>{
 try{
  const raw=structuredClone(event.data),d=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
  const parsed=PrayerMath.parseData(d,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  if(!parsed.characters?.length)throw new Error('No character talents could be decoded.');
  postMessage({hoard:PrayerMath.getSpelunkingAmberHoard(parsed),context:PrayerMath.getSpelunkingPlannerContext(parsed,WORLD7_CATALOG.Research)});
 }catch(error){postMessage({error:error.message||String(error)});}
};

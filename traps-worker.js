'use strict';
self.window=self;
importScripts('prayer-math-engine.js','traps-data.js','traps-model.js');
self.onmessage=({data:raw})=>{
 try{
  if(!Object.keys(raw.data||raw).some(k=>/^PldTraps_\d+$/.test(k))){self.postMessage({result:{missing:true}});return;}
  let characters=[],warning=null;
  try{characters=PrayerMath.parseData(structuredClone(raw.data||raw),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament)?.characters||[];}catch{warning='Character levels and equipment could not be decoded. Saved trap placements are still shown.';}
  self.postMessage({result:{...TrapsModel.build(raw,characters),warning}});
 }catch(error){self.postMessage({error:error.message});}
};

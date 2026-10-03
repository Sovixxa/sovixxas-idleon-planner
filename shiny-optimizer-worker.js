'use strict';
self.window=self;
importScripts('prayer-math-engine.js','traps-data.js','shiny-optimizer-model.js');
self.onmessage=({data:raw})=>{
 try{
  const save=raw.data||raw;
  if(!Object.keys(save).some(k=>/^PldTraps_\d+$/.test(k))){self.postMessage({result:{missing:true}});return;}
  const parsed=PrayerMath.parseData(structuredClone(save),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  if(!parsed.characters?.length)throw Error('No characters could be decoded. Import a complete export.');
  const result=PrayerMath.getShinyLoadoutData(parsed);
  if(!result.roster.every(c=>Number.isFinite(c.placement))||!result.candidates.every(c=>Number.isFinite(c.open)&&Number.isFinite(c.bundle)))throw Error('Some shiny bonuses could not be calculated. Import a complete export.');
  for(const ch of result.roster)ch.huntKnown=save["QuestComplete_"+ch.id]!==undefined;
  result.saved=ShinyOptimizerModel.savedTraps(raw);result.catalog=TRAPS_CATALOG;
  result.incomplete=['Cards0','PrayOwned','CauldronInfo'].filter(k=>save[k]===undefined);
  self.postMessage({result});
 }catch(error){self.postMessage({error:error.message});}
};

'use strict';
importScripts('dashboard-math.js');
self.onmessage=event=>{
 try{
  const raw=event.data,data=structuredClone(raw.data||raw);if(!data.OptLacc)data.OptLacc=data.OptionsListAccount;
  self.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  const parsed=self.DashboardMath.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  const flatten=value=>Array.isArray(value)?value:Object.values(value||{}).flatMap(page=>page.orderedTalents||[]);
  const characters=(parsed.characters||[]).map(character=>{
   const active=Number(character.selectedTalentPreset)||0,presets=[];
   const pack=values=>Object.fromEntries(values.filter(t=>Number.isFinite(t.skillIndex)&&Number.isFinite(t.level)).map(t=>[t.skillIndex,{level:t.level,baseLevel:t.baseLevel??t.level}]));
   presets[active]=pack([...flatten(character.flatTalents),...flatten(character.flatStarTalents)]);
   presets[1-active]=pack([...flatten(character.talentPreset?.flatTalents),...flatten(character.talentPreset?.flatStarTalents)]);
   return {id:character.playerId,presets};
  });
  self.postMessage({characters});
 }catch(error){self.postMessage({error:error.message||'Account talent bonuses could not be calculated.'});}
};

'use strict';
self.window=self;self.localStorage={getItem(){return null;},setItem(){}};
importScripts('dashboard-math.js');
self.onmessage=({data})=>{try{
 const raw=data.raw,d=typeof raw.data==='string'?JSON.parse(raw.data):(raw.data||raw);
 const royal=typeof d.RoyalG==='string'?JSON.parse(d.RoyalG):d.RoyalG;
 if(!Array.isArray(royal)||!Array.isArray(royal[2])||!Array.isArray(royal[23]))throw Error('Incomplete Royal Guardian save');
 const normalized=structuredClone(d);if(!normalized.OptLacc)normalized.OptLacc=normalized.OptionsListAccount;
 const parsed=DashboardMath.parseData(normalized,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
 self.postMessage({characters:DashboardMath.getOutpostCombatContext(parsed.account,parsed.characters,d,data.mapIds)});
}catch(e){self.postMessage({error:'Could not calculate combat inputs from this save. Import a complete account export.'});}};

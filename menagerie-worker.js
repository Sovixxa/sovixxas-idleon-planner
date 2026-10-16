'use strict';
self.window=self;
importScripts('prayer-math-engine.js');
self.onmessage=({data:raw})=>{try{const d=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
 const parsed=PrayerMath.parseData(structuredClone(d),raw.charNames||[],raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
 self.postMessage(PrayerMath.getMenagerieAnalysis(raw,parsed.account));
}catch(error){self.postMessage({available:false,reason:error.message});}};

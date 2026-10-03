self.window=self;
importScripts('prayer-math-engine.js','bubble-optimizer-context.js');
self.onmessage=e=>{try{const raw=e.data,parsed=PrayerMath.parseData(structuredClone(raw.data||raw),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);self.postMessage(BubbleOptimizerContext.build(parsed));}catch(error){self.postMessage({warning:'Full account multipliers could not be decoded. Cap stop levels and spending estimates remain unknown where account data is needed.'});}};

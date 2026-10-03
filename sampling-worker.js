'use strict';
importScripts('prayer-math-engine.js');
self.onmessage=({data:raw})=>{try{
 const save=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
 if(!save.Print&&!save.Printer)throw Error('Import a full export containing printer samples.');
 const errors=[],original=console.error;let parsed;try{console.error=(...args)=>errors.push(String(args[0]));parsed=PrayerMath.parseData(structuredClone(save),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=original;}if(errors.length)throw Error('The full account could not be decoded for sampling. Import a fresh export.');const a=parsed.account;
 postMessage({rows:parsed.characters.map((c,i)=>({id:c.playerId,name:c.name,rate:Math.min(90,PrayerMath.getPrinterSampleRate(c,a,a.charactersLevels)),samples:(a.printer?.[i]||[]).filter(s=>s.item!=='Blank').map(s=>({item:s.item,name:PrayerMath.stampItemCatalog[s.item]?.displayName||PrayerMath.stampItemCatalog[s.item]?.name||s.item,value:s.value,output:s.boostedValue,active:s.active,freshMultiplier:s.value>0?s.boostedValue/s.value/(s.breakdown?.find(b=>b.name==='Legend Talent')?.value||1):null}))}))});
 }catch(error){postMessage({error:error.message});}};

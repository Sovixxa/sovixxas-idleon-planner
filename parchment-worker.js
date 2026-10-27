self.window=self;self.localStorage={getItem(){return null;},setItem(){}};
importScripts('dashboard-math.js');
self.onmessage=({data:{raw}})=>{try{
 const d=typeof raw.data==='string'?JSON.parse(raw.data):(raw.data||raw),normalized=structuredClone(d);
 if(!normalized.OptLacc)normalized.OptLacc=normalized.OptionsListAccount;
 const p=DashboardMath.parseData(normalized,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
 self.postMessage(DashboardMath.getParchmentContext(p.account,p.characters));
}catch(e){self.postMessage({error:'Could not read the saved RG combat setup. Import a complete account export.'});}};

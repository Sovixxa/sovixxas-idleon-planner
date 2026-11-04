self.window=self;self.localStorage={getItem(){return null;},setItem(){}};
importScripts('dashboard-math.js');
self.onmessage=({data:{raw}})=>{try{
 const d=typeof raw.data==='string'?JSON.parse(raw.data):(raw.data||raw),normalized=structuredClone(d);
 if(!normalized.OptLacc)normalized.OptLacc=normalized.OptionsListAccount;
 const parsed=DashboardMath.parseData(normalized,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
 const forecast=DashboardMath.getPurityForecast(normalized,parsed.account,parsed.characters),context=forecast.initial,outposts=context?.outposts||[];
 const rows=outposts.map(o=>{const after=forecast.projected.outposts.find(p=>p.mapIndex===o.mapIndex);return ({id:o.mapIndex,name:o.name,world:o.world,bar:{...after.rankBars[4],rank:o.rankBars[4].rank,required:o.rankBars[4].required,exp:o.rankBars[4].exp,progress:o.rankBars[4].progress,creditedExp:after.rankBars[4].exp,pendingSeconds:forecast.seconds,timerUnlocked:forecast.timerUnlocked},supports:o.supports,supportBonus:o.rankBars?.[4]?.supportBonus,
 supportSources:outposts.filter(s=>s.isSupport).map(s=>({name:s.name,links:[8,9].filter(slot=>Math.round(Number(s.raw?.[slot])-1000)===o.mapIndex).length})).filter(s=>s.links>0)});});
 self.postMessage({rows});
}catch(e){self.postMessage({error:'Could not calculate Purity ranks. Import a complete account export and retry.'});}};

'use strict';
importScripts('dashboard-math.js');
onmessage=e=>{
  try {
    const raw=structuredClone(e.data),data=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
    if(!data.OptLacc)data.OptLacc=data.OptionsListAccount;
    const parsed=DashboardMath.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
    postMessage({context:DashboardMath.getSushiContext(parsed.account)});
  }catch(error){postMessage({error:error.message||String(error)});}
};

'use strict';
importScripts('prayer-math-engine.js');
onmessage=({data:raw})=>{try{
 const decode=v=>typeof v==='string'?JSON.parse(v):v,save=decode(raw.data)||raw;
 if(!save.OptLacc)throw Error('Load a complete account export to plan Killroy.');
 const parsed=PrayerMath.parseData(save,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament),a=parsed.account;
 const galleryLevel=Number(a.accountOptions[467])||0,coralSources=a.coralReef?.reefDayGains?.breakdown?.categories?.find(x=>x.name==='Additive')?.sources||[];
 const otherPools={15:Math.max(0,(a.gallery?.bonusMulti||1)-1-.1*galleryLevel/(200+galleryLevel)),18:coralSources.filter(x=>x.name!=='Killroy Shop').reduce((sum,x)=>sum+(Number(x.value)||0),0)/100};
 const time=a.timeAway,valid=Number.isFinite(time?.GlobalTime)&&Number.isFinite(time?.ShopRestock)&&Number.isFinite(a.accountOptions?.[39]);
 postMessage({result:JSON.parse(JSON.stringify({otherPools,killroy:a.killroy,options:a.accountOptions,dream:decode(save.Dream)||[],prime:!!PrayerMath.isRiftBonusUnlocked(a.rift,'Killroy_Prime'),schedule:valid?PrayerMath.getKillroySchedule(a,parsed.characters,raw.serverVars||{}):[],savedTime:time?.GlobalTime,swapKnown:raw.serverVars?.KillroySwap!=null}))});
}catch(e){postMessage({error:e.message});}};

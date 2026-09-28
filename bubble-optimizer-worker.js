self.window=self;
importScripts('prayer-math-engine.js');
self.onmessage=e=>{
 try{
  const raw=e.data,save=structuredClone(raw.data||raw),parsed=PrayerMath.parseData(save,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  const account=parsed.account,value=PrayerMath.getPrismaMulti(account).value;
  if(!Number.isFinite(value)||value<2||value>4)throw new Error('Invalid Prisma multiplier');
  const vial=account.alchemy.vials.find(v=>v.stat==='AlchBubbleCost');
  const vialBonus=vial?PrayerMath.growth(vial.func,vial.level,vial.x1,vial.x2,false)*vial.multiplier:0;
  const shared=Number.isFinite(vialBonus)?{Y6:vialBonus}:{};
  const common=Math.max(.05,1-(vialBonus+PrayerMath.getBubbleBonus(account,'UNDEVELOPED_COSTS',false))/100)*(PrayerMath.getAchievementStatus(account.achievements,108)? .9:1);
  const discounts=['power','quicc','high-iq','kazam'].map((key,g)=>{
   const level=account.alchemy.cauldrons[key]?.boosts?.cost?.level;
   if(!Number.isFinite(level))return null;
   const brew=Math.max(.1,1-Math.round(10*90*level/(level+100))/1000);
   const name=['ORANGE_BARGAIN','GREEN_BARGAIN','PURPLE_BARGAIN','YELLOW_BARGAIN'][g];
   return {all:common*brew*Math.max(.05,1-PrayerMath.getBubbleBonus(account,name,false,false)/100),matching:common*brew*Math.max(.05,1-PrayerMath.getBubbleBonus(account,name,false,g<3)/100)};
  });
  self.postMessage({prismaMulti:value,shared,spending:{discounts,larry:PrayerMath.getBubbleBonus(account,'LAAARRRRYYYY',false),liquids:account.alchemy.liquids,particles:account.atoms?.particles,boron:account.atoms?.atoms?.[4]?.level>0,remainingAtomClicks:account.accountOptions?.[135]}});
 }catch(error){self.postMessage({warning:'Full account multipliers could not be decoded. Cap stop levels and spending estimates remain unknown where account data is needed.'});}
};

'use strict';
importScripts('dashboard-math.js','divinity-planner-model.js');
onmessage=event=>{
 try{
  const raw=event.data,parse=v=>typeof v==='string'?JSON.parse(v):v,d=parse(raw.data)||raw;
  if(!Array.isArray(parse(d.Divinity)))throw new Error('Load a complete account export to calculate Divinity sources.');
  const needed=[['OptionsListAccount','OptLacc'],['GemItemsPurchased','GemItems'],['Sailing'],['Spelunk'],['Holes'],['CauldronInfo'],['CauldronBubbles'],['CauldronP2W'],['StampLv'],['Meals'],['ArcadeUpg'],['Rift'],['Ninja'],['UpgVault'],['Sushi'],['Cards0'],['BribeStatus'],['AchieveReg']];
  const missing=needed.filter(keys=>keys.every(k=>d[k]==null)).map(keys=>keys[0]);
  if(missing.length)throw new Error('This export is missing source data: '+missing.join(', ')+'. Import a complete export for reliable totals.');
  const time=parse(d.TimeAway),at=Number(time?.GlobalTime)||Number(time?.Player),OriginalDate=Date;
  if(at)self.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[at]));}static now(){return at;}};
  try{const parsed=DashboardMath.parseData(d,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);postMessage({result:DashboardMath.getDivinityBreakdown(parsed,raw,DivinityPlannerModel)});}finally{self.Date=OriginalDate;}
 }catch(error){postMessage({error:error.message});}
};

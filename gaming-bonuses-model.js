(function(root){
'use strict';
const parse=v=>typeof v==='string'?JSON.parse(v):v;
function calculate(raw,M=root.DashboardMath){
 raw=structuredClone(raw||{});const data=parse(raw.data)||raw;
 if(!parse(data.Gaming)||!parse(data.GamingSprout))return {missing:true};
 if(!data.OptLacc)data.OptLacc=data.OptionsListAccount;
 const saved=Number(parse(data.TimeAway)?.GlobalTime||0)*1000,OriginalDate=root.Date;
 root.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[saved||OriginalDate.now()]));}static now(){return saved||OriginalDate.now();}};
 try{const p=M.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);return M.getGamingBreakdown(p.account,p.characters,data);}finally{root.Date=OriginalDate;}
}
root.GamingBonusesModel={calculate};if(typeof module!=='undefined')module.exports=root.GamingBonusesModel;
})(globalThis);

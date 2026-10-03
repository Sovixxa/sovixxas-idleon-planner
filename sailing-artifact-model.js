(function(root){
'use strict';
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
function calculate(raw,M=root.DashboardMath){
 raw=structuredClone(raw||{});const data=parse(raw.data)||raw;
 if(!data.Sailing)return {missing:true};
 if(!data.OptLacc)data.OptLacc=data.OptionsListAccount;
 const saved=Number(parse(data.TimeAway)?.GlobalTime||0)*1000,OriginalDate=root.Date;
 root.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[saved||OriginalDate.now()]));}static now(){return saved||OriginalDate.now();}};
 try{const p=M.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);return M.getSailingArtifactData(p.account,p.characters,data);}finally{root.Date=OriginalDate;}
}
root.SailingArtifactModel={calculate};if(typeof module!=='undefined')module.exports=root.SailingArtifactModel;
})(globalThis);

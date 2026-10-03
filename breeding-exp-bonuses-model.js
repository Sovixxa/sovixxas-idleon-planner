(function(root){
'use strict';
function calculate(raw){raw=structuredClone(raw||{});const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};const data=parse(raw.data)||raw;if(!data.Breeding)return {missing:true};if(!data.OptLacc)data.OptLacc=data.OptionsListAccount;const p=root.DashboardMath.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);return root.DashboardMath.getBreedingExpBonuses(p.account,p.characters);}
root.BreedingExpBonusesModel={calculate};
})(globalThis);

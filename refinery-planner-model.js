(function(root){
'use strict';
const pretty=v=>String(v||'').replaceAll('_',' ');
function build(account,characters,M=root.PrayerMath){
 const salts=account.refinery.salts,times=M.getRefineryCycleTimes(account,characters);
 const seconds=i=>Math.ceil(i<3?times.combustionTime:i<6?times.synthesisTime:times.polymerizeTime);
 const power=rank=>M.getPowerPerCycle(rank,account);
 // Binary search avoids rounding errors at floor() boundaries and honors the output cap.
 function requiredRank(required){
  if(required>250000+1e-8)return null;
  let low=1,high=1;while(power(high)+1e-8<required&&high<100000)high*=2;
  while(low<high){const mid=Math.floor((low+high)/2);if(power(mid)+1e-8>=required)high=mid;else low=mid+1;}
  return low;
 }
 const capRank=requiredRank(250000),balance=M.getSaltsBalance(account,characters,times);
 const runningAccount={...account,refinery:{...account.refinery,salts:salts.map(s=>({...s,active:s.unlocked?1:0}))}};
 const steady=M.getSaltsBalance(runningAccount,characters,times);
 const targets=salts.map(s=>s.rank),blocked=[];
 // Work backwards to find support ranks, then present upgrades upstream first.
 for(let i=salts.length-1;i>0;i--){
  if(!salts[i].unlocked||!salts[i-1].unlocked)continue;
  const input=salts[i].cost.find(c=>c.rawName===salts[i-1].rawName);if(!input)continue;
  const cost=M.calcCost(account.refinery,targets[i],input.quantity,input.rawName,i);
  const target=requiredRank(cost*seconds(i-1)/seconds(i));
  if(target===null)blocked.push(i);else targets[i-1]=Math.max(targets[i-1],target);
 }
 const shortages=M.getSaltMatsTimeLeft(account,characters,times);
 const rows=salts.map((s,i)=>{
  const prior=salts[i-1],input=s.cost.find(c=>c.rawName===prior?.rawName);
  const nextSupport=input?requiredRank(M.calcCost(account.refinery,s.rank+1,input.quantity,input.rawName,i)*seconds(i-1)/seconds(i)):null;
  const stored=(account.refinery.refineryStorage||[]).filter(x=>x.rawName===s.rawName).reduce((n,x)=>n+Number(x.amount||0),0);
  return {...balance[i],name:pretty(s.saltName),icon:`assets/${s.rawName}.png`,cycleSeconds:seconds(i),power:power(s.rank),
   stored,refined:s.refined,capacity:s.powerCap,auto:s.autoRefinePercentage,target:targets[i],safeRank:steady[i].maxSafeRank,
   steadyDeficit:steady[i].isDeficit,steadyBalance:steady[i].balancePerHour,nextSupport,priorName:pretty(prior?.saltName),capRank,
   inputs:s.cost.map(c=>({name:pretty(c.name),rawName:c.rawName,quantity:M.calcCost(account.refinery,s.rank,c.quantity,c.rawName,i),stock:c.totalAmount})),
   shortage:shortages.find(x=>x.rawName===s.rawName)||null};
 });
 return {rows,blocked,plan:rows.filter(r=>r.unlocked&&r.target>r.rank).map(r=>({index:r.index,name:r.name,from:r.rank,to:r.target})),
  cycleTimes:[times.combustionTime,times.synthesisTime,times.polymerizeTime].map(Math.ceil),merit:account.refinery.refinerySaltTaskLevel??0};
}
function calculate(raw,M=root.PrayerMath){
 raw=structuredClone(raw);
 const data=typeof raw?.data==='string'?JSON.parse(raw.data):raw?.data||raw;
 if(!data?.Refinery)return {missing:true,rows:[],plan:[],blocked:[]};
 const parsed=M.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
 if(!parsed.account?.refinery?.salts?.length)throw Error('Could not decode Refinery data. Import a fresh full export.');
 return build(parsed.account,parsed.characters,M);
}
root.RefineryPlannerModel={build,calculate};
})(typeof window!=='undefined'?window:globalThis);

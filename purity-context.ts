import {getRoyalGuardian, getOutpostExpRank} from './vendor/idleon-toolbox/parsers/class-specific/royalGuardian';

const parse = (v:any) => typeof v === 'string' ? JSON.parse(v) : v;
// Apply the rank portion of CollectAll to a private copy. Intel is awarded first;
// deployed units then run in saved order, recalculating rank-dependent multipliers.
export function getPurityForecast(data:any, account:any, characters:any[]) {
 const copy = structuredClone(data), g = parse(copy.RoyalG), maps = parse(copy.RoyalMaps);
 copy.RoyalG = g; copy.RoyalMaps = maps;
 const initial = getRoyalGuardian(copy, account, characters);
 const seconds = Math.max(0, Number(g?.[3]?.[0]) || 0), hours = seconds / 3600;
 const timerUnlocked = Number(g?.[2]?.[30]) > 0;
 const byMap = new Map(initial.outposts.map((o:any) => [o.mapIndex,o]));
 const intelBonus = initial.armory.upgrades.find((u:any) => u.index === 72)?.bonus || 0;
 const rate = (o:any,type:number) => {
  const before = o.rankBars, row = maps[o.mapIndex];
  return before[type].expPerUnit
   / (1 + before[1].rank * intelBonus / 100)
   * (1 + getOutpostExpRank(row,1) * intelBonus / 100)
   / (before[4].rank >= 1 ? 3 : 1)
   * (getOutpostExpRank(row,4) >= 1 ? 3 : 1);
 };
 for(const o of initial.outposts) {
  maps[o.mapIndex][3] = Number(maps[o.mapIndex][3]) + rate(o,0) * o.rankBars[0].units * hours;
  maps[o.mapIndex][4] = Number(maps[o.mapIndex][4]) + rate(o,1) * o.rankBars[1].units * hours;
 }
 for(let world=0;world<8;world++) {
  const jobs = g?.[6+2*world] || [], targets = g?.[7+2*world] || [];
  for(let slot=0;slot<jobs.length;slot++) {
   const job = Number(jobs[slot]), target = Number(targets[slot]), o:any = byMap.get(target);
   if(!o) continue;
   if(job>=5 && job<=7) maps[target][job] = Number(maps[target][job]) + rate(o,job-3) * hours;
   else if(job===4 && Number(g?.[2]?.[17])>=1) {
    const ranks = [0,1,2,3,4].map(type=>getOutpostExpRank(maps[target],type));
    const best = ranks.reduce((best,rank,type)=>rank>ranks[best]?type:best,0);
    maps[target][3+best] = Number(maps[target][3+best]) + rate(o,3) / 2 * hours;
   }
  }
 }
 g[3][0]=0;
 const projected = getRoyalGuardian(copy,account,characters);
 return {seconds,timerUnlocked,initial,projected};
}

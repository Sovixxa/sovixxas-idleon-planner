'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={console:{log(){},warn(){},error(){}},structuredClone};c.window=c;vm.createContext(c);
for(const file of ['prayer-math-engine.js','refinery-planner-model.js','refinery-planner.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw),M=c.PrayerMath;
const copy=structuredClone(raw);
const p=M.parseData(copy.data,copy.charNames,copy.companion,copy.guildData,copy.serverVars,copy.accountCreateTime,copy.tournament);
const result=c.RefineryPlannerModel.build(p.account,p.characters);
assert(result.rows.length>=6);assert(JSON.stringify(raw)===before,'Save must not change');
// Recovery must balance the entire chain, including costs raised by support upgrades.
const repaired={...p.account,refinery:{...p.account.refinery,salts:p.account.refinery.salts.map((s,i)=>({...s,rank:result.rows[i].target,active:1}))}};
const balances=M.getSaltsBalance(repaired,p.characters);
for(const row of balances)if(row.unlocked&&!result.blocked.includes(row.index+1))assert(row.balancePerHour>=-1e-7,`${row.saltName} still drains`);
for(const row of result.rows.filter(r=>r.unlocked&&r.index>0)){
 const candidate={...p.account,refinery:{...p.account.refinery,salts:p.account.refinery.salts.map((s,i)=>({...s,rank:i===row.index?row.safeRank:s.rank,active:1}))}};
 const ok=M.getSaltsBalance(candidate,p.characters)[row.index-1];assert(ok.balancePerHour>=-1e-7);
}
assert.equal(result.rows[0].auto,p.account.refinery.salts[0].autoRefinePercentage);
assert.equal(c.RefineryPlannerModel.calculate({}).missing,true);
assert(c.RefineryPlanner.content(result).includes('What to level first'));
assert(c.RefineryPlanner.content(result).includes('Ingredients per cycle'));
// A paused supplier must not be shown as producing its hypothetical output.
const paused={...p.account,refinery:{...p.account.refinery,salts:p.account.refinery.salts.map((s,i)=>({...s,active:i===0?0:1}))}};
const pauseResult=c.RefineryPlannerModel.build(paused,p.characters);
assert.equal(pauseResult.rows[0].outputPerHour,0);assert(pauseResult.rows[0].isDeficit);
// Merit changes salt costs, so support targets must respond to it.
const early={...p.account,companions:{list:[]},refinery:{...p.account.refinery,refinerySaltTaskLevel:0,salts:p.account.refinery.salts.map((s,i)=>({...s,rank:i===0?2:3,unlocked:i<3,active:1}))}};
const earlyResult=c.RefineryPlannerModel.build(early,p.characters);
assert(earlyResult.plan.length>0);assert(earlyResult.plan.every((r,i,a)=>!i||a[i-1].index<r.index));
const meritResult=c.RefineryPlannerModel.build({...early,refinery:{...early.refinery,refinerySaltTaskLevel:6}},p.characters);
assert(meritResult.rows[0].target<=earlyResult.rows[0].target);
const capped={...early,refinery:{...early.refinery,salts:early.refinery.salts.map((s,i)=>({...s,rank:i===1?100000:s.rank}))}};
assert(c.RefineryPlannerModel.build(capped,p.characters).blocked.includes(1));
// Hand-calculated six-salt case: no companion, no merit, synthesis 4x slower.
const baseRanks=[4,2,1,1,1,1];
const basic={refinery:{refinerySaltTaskLevel:0,salts:baseRanks.map((rank,i)=>({rawName:`Refinery${i+1}`,saltName:`Salt ${i+1}`,rank,active:1,unlocked:true,powerCap:100,refined:0,cost:i?[{rawName:`Refinery${i}`,quantity:i===3?1:2,totalAmount:1000}]:[]}))}};
const fixed={...M,getRefineryCycleTimes:()=>({combustionTime:900,synthesisTime:3600,polymerizeTime:360000})};
const known=c.RefineryPlannerModel.build(basic,[],fixed);
assert.deepEqual(Array.from(known.rows,r=>r.target),[6,3,2,3,2,1]);
assert.equal(known.rows[2].balancePerHour,3); // 4 blue produced, 1 used by green per hour.
assert.equal(known.rows[3].balancePerHour,-1);
const calculated=c.RefineryPlannerModel.calculate(raw);assert(calculated.rows.length>=6);
assert(JSON.stringify(raw)===before,'Calculation must not mutate the export');
console.log('Refinery: recovery chain, safe ceilings, paused suppliers, merit scaling, capped output, empty saves and immutability pass.');

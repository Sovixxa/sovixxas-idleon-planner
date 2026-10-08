const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('./engine');
const state=E.parseInput(fs.readFileSync('../example json.txt','utf8')),arr=E.arrangementFromBoard(state),before=JSON.stringify(state);
// Even the closest possible rates at <=500 runs outrank every speed gain.
assert(E.timedObjective({clearRate:1/499,medianClearTime:10000})>E.timedObjective({clearRate:1/500,medianClearTime:0}));
assert(E.timedObjective({clearRate:1,medianClearTime:10000})>E.timedObjective({clearRate:499/500,medianClearTime:0}));
assert(E.timedObjective({clearRate:0.75,medianClearTime:10,p90ClearTime:100})>E.timedObjective({clearRate:0.75,medianClearTime:11,p90ClearTime:11}));
assert(E.timedObjective({avgPeakDps:200,clearRate:0},'dps')>E.timedObjective({avgPeakDps:100,clearRate:1},'dps'));
assert(E.timedObjective({avgBloodcells:200,clearRate:0},'bloodcells')>E.timedObjective({avgBloodcells:100,clearRate:1},'bloodcells'));
assert.equal(E.timedObjective({avgBloodcells:null},'bloodcells'),-Infinity);
// With fixed levels and an unbeatable DPS record, every hit uses one multiplier.
const fixed=E.cloneState(state);fixed.bestDps=1e100;fixed.upgrades[10]=0;fixed.upgrades[12]=0;
const options={seed:42,damageScale:0.000001,useSteroid:false};
const failed=E.simulateOne(fixed,arr,options);
assert(!failed.clear);assert(failed.bloodcellsGained>0);
assert(Math.abs(failed.bloodcellsGained/failed.totalDamage/E.bloodcellBonuses(fixed).multiplier-1)<1e-10);
const clear=E.simulateOne(fixed,arr,{...options,damageScale:1e8});
assert(clear.clear);assert(clear.totalDamage>E.bossHP(fixed.obstruction));
assert(Math.abs(clear.bloodcellsGained/clear.totalDamage/E.bloodcellBonuses(fixed).multiplier-1)<1e-10);
const sepsis=E.cloneState(fixed);sepsis.upgrades[16]=6;sepsis.fever=2;
const rash=E.cloneState(sepsis);rash.fever=3;
assert.equal(E.bloodcellBonuses(sepsis).multiplier/E.bloodcellBonuses(rash).multiplier,2);
const stats=E.simulateMany(state,arr,{runs:4,seed:9,keepRuns:true});
assert.equal(stats.avgBloodcells,stats.results.reduce((n,x)=>n+x.bloodcellsGained,0)/4);
const missing=E.cloneState(state);missing.rawData={};
assert.equal(E.simulateMany(missing,arr,{runs:1}).avgBloodcells,null);
assert.throws(()=>E.optimizeOperation(missing,{objectiveMode:'bloodcells'}),/full account export/);
assert.throws(()=>E.optimizeOperation(fixed,{objectiveMode:'dps'}),/DPS Biometrics/);
for(const objectiveMode of ['chance','dps','bloodcells']){
 const result=E.optimizeOperation(state,{objectiveMode,timeMs:500,runs:8,mixLimit:12,shortlist:4,screenRuns:1,refineRuns:1,finalists:4,searchFever:false});
 assert(E.isLegalLayout(state,result.arrangement));
 assert(E.timedObjective(result.stats,objectiveMode)>=E.timedObjective(result.currentStats,objectiveMode));
 assert(result.stats.avgBloodcells>0);assert(result.stats.avgPeakDps>0);
}
assert.equal(JSON.stringify(state),before);
console.log('Jelly DPS and Bloodcell objectives: per-hit payout, failed attempts, overkill, Sepsis, missing data, legal search and save preservation pass.');

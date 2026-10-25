'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),path=require('node:path');
const source=fs.readFileSync(require.resolve('./engine'),'utf8');
// Observe real combat batches, without replacing the combat model with a mock.
const batches=[];
const instrumented=new Module(path.join(__dirname,'quality-engine.cjs'),module);
instrumented.filename=instrumented.id;
instrumented.paths=module.paths;
instrumented._compile(source.replace('function simulateMany(state,arr,options={}){',
 'function simulateMany(state,arr,options={}){const stats=simulateManyImpl(state,arr,options);if(options.seed===0xD00D)module.record({arr,options,stats});return stats;} function simulateManyImpl(state,arr,options={}){'),instrumented.filename);
instrumented.record=batch=>batches.push(batch);
const E=instrumented.exports,state=E.parseInput(fs.readFileSync('../example json.txt','utf8'));
const before=JSON.stringify(state),report=[];
// A changed string or a replaced account must not reuse stale parsed data.
const data={rawData:{Spelunk:'[1]'}};
assert.deepEqual(E.rawArray(data,'Spelunk'),[1]);
assert.equal(E.rawArray(data,'Spelunk'),E.rawArray(data,'Spelunk'),'unchanged JSON is parsed only once');
data.rawData.Spelunk='[2]';assert.deepEqual(E.rawArray(data,'Spelunk'),[2]);
data.rawData={Spelunk:'[3]'};assert.deepEqual(E.rawArray(data,'Spelunk'),[3]);
data.rawData.Spelunk='bad';assert.equal(E.rawArray(data,'Spelunk'),null);
data.rawData.Spelunk=[4];assert.equal(E.rawArray(data,'Spelunk'),data.rawData.Spelunk);
for(const objectiveMode of ['chance','dps','bloodcells','cellExp']){
 batches.length=0;
 // Exercise the shipped Normal preset; wall-clock search tests must run without competing workloads.
 const options={objectiveMode,timeMs:5200,runs:128,mixLimit:480,shortlist:64,screenRuns:2,refineRuns:12,refineCount:8,finalists:4,timingRuns:3,searchFever:false,searchSeed:271828,damageScale:1};
 const result=E.optimizeOperation(state,options),validation=batches.slice();
 assert(validation.length>=2,'compare multiple fully validated layouts');
 assert(validation.every(b=>b.options.runs===128),'equal validation sample sizes');
 for(const b of validation){
  assert(E.isLegalLayout(state,b.arr));
  assert(E.timedObjective(result.stats,objectiveMode)>=E.timedObjective(b.stats,objectiveMode),'return the strongest independently validated candidate');
 }
 assert(E.timedObjective(result.stats,objectiveMode)>=E.timedObjective(result.currentStats,objectiveMode));
 const replay=E.simulateMany(state,result.arrangement,{...options,seed:0xD00D,steroidStartSeconds:result.steroidStart??0});
 assert.deepEqual(replay,result.stats,'scores reproduce from the winning layout and timing');
 // An entirely new random seed set was never used by construction, screening,
 // timing selection or winner selection. Report quality on these unseen trials.
 const holdout={...options,runs:256,seed:0x715A9};
 const winner=E.simulateMany(state,result.arrangement,{...holdout,steroidStartSeconds:result.steroidStart??0});
 const saved=E.simulateMany(state,result.current,{...holdout,steroidStartSeconds:result.currentSteroidStart??0});
 const metric=s=>objectiveMode==='chance'?{clearRate:s.clearRate,medianClearTime:s.medianClearTime,hpRemaining:s.medianHpRemaining}:objectiveMode==='dps'?s.avgPeakDps:objectiveMode==='bloodcells'?s.avgBloodcells:{levels:s.avgCellLevelsGained,progress:s.avgCellLevelProgress};
 const row={objectiveMode,candidates:result.candidates,simulated:result.simulated,validated:validation.length,searchMs:Math.round(result.timeMs),holdoutRuns:256,saved:metric(saved),winner:metric(winner),holdoutImproved:E.timedObjective(winner,objectiveMode)>=E.timedObjective(saved,objectiveMode)};
 report.push(row);console.log(JSON.stringify(row));
 assert(row.holdoutImproved,'sample-save improvement survives unseen random trials: '+objectiveMode);
}
assert.equal(JSON.stringify(state),before,'search and cache never mutate the imported save');
// Also exercise a packed, fully unlocked board, where random scattered removal
// often cannot create room for a Mitochondrion or Gigacyst.
const full=E.cloneState(state);full.upgrades.fill(1,0,8);full.plots=E.PLOTS.map((_,i)=>i);
const packed=E.fillEmptySlots(full,E.arrangementFromBoard(full));full.board.fill(-1);
for(const p of packed)full.board[p.anchor]=p.type;
for(const objectiveMode of ['chance','dps','bloodcells','cellExp']){
 batches.length=0;
 const result=E.optimizeOperation(full,{objectiveMode,timeMs:1200,runs:32,screenRuns:2,refineRuns:8,refineCount:4,finalists:2,timingRuns:2,timingSearch:'coarse',searchFever:false,searchSeed:314159,damageScale:1});
 assert(E.isLegalLayout(full,result.arrangement));
 for(const b of batches)assert(E.timedObjective(result.stats,objectiveMode)>=E.timedObjective(b.stats,objectiveMode));
 assert(E.timedObjective(result.stats,objectiveMode)>=E.timedObjective(result.currentStats,objectiveMode));
 console.log('Packed full board:',objectiveMode,result.candidates,'candidates,',result.simulated,'batches');
}
fs.writeFileSync('../audit/jelly-search-quality.json',JSON.stringify(report,null,2)+'\n');
console.log('Real-combat quality checks passed for all four objectives.');

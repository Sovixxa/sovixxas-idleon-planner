'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('./engine');
// The winning route temporarily gets worse. A greedy single-change search
// stops at the root; lookahead must retain and expand that weaker position.
const nodes={root:{key:'root',proxy:10,obj:10},a:{key:'a',proxy:8},b:{key:'b',proxy:9},win:{key:'win',proxy:30}};
const graph={root:['a','b','a'],a:['root','win'],b:['win'],win:[]},scores={a:2,b:3,win:30},evaluated=[];
const route=E.searchLayoutBeam([nodes.root],{width:2,depth:2,deadline:Infinity,expand:c=>graph[c.key].map(k=>nodes[k]),evaluate:c=>{evaluated.push(c.key);c.obj=scores[c.key];}});
assert.equal(route.best.key,'win');assert.equal(route.depth,2);
assert.equal(evaluated.filter(k=>k==='win').length,1,'different move orders reuse the same board');
assert(route.duplicates>=2);assert.equal(new Set(evaluated).size,evaluated.length);
const expired=E.searchLayoutBeam([nodes.root],{width:2,depth:3,deadline:0,expand(){throw Error('expired search expanded');},evaluate(){throw Error('expired search simulated');}});
assert.equal(expired.best.key,'root');assert.equal(expired.evaluated,0);

const state=E.parseInput(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(state),report=[];
for(const objectiveMode of ['chance','dps','bloodcells','cellExp']){
 const settings={objectiveMode,timeMs:3000,runs:64,screenRuns:3,refineRuns:12,refineCount:8,finalists:4,useSteroid:false,searchFever:false,damageScale:1,searchSeed:123456};
 const original=E.optimizeOperation(state,settings);
 const result=E.optimizeOperation(state,{...settings,lookaheadDepth:3,beamWidth:6,incumbentArr:original.arrangement,incumbentFever:original.fever});
 assert(result.lookahead.depth>0&&result.lookahead.evaluated>0,'real combat explores future layouts');
 assert(E.isLegalLayout(state,result.arrangement));
 assert(E.timedObjective(result.stats,objectiveMode)>=E.timedObjective(original.stats,objectiveMode),'deeper search retains a stronger incumbent');
 const check=E.simulateMany(state,result.arrangement,{...settings,seed:0xD00D});
 assert.deepEqual(check,result.stats,'lookahead leaves final combat validation intact');
 const holdout={...settings,runs:128,seed:0xABCDEF};
 const prior=E.simulateMany(state,original.arrangement,holdout),winner=E.simulateMany(state,result.arrangement,holdout);
 const metric=s=>objectiveMode==='chance'?{clearRate:s.clearRate,hpRemaining:s.medianHpRemaining}:objectiveMode==='dps'?s.avgPeakDps:objectiveMode==='bloodcells'?s.avgBloodcells:s.avgCellLevelsGained;
 const row={objectiveMode,lookahead:result.lookahead,candidates:result.candidates,previous:metric(prior),lookaheadWinner:metric(winner),holdoutRuns:128};
 report.push(row);console.log(JSON.stringify(row));
}
assert.equal(JSON.stringify(state),before);
fs.writeFileSync('../audit/jelly-lookahead-quality.json',JSON.stringify(report,null,2)+'\n');
console.log('Lookahead escapes local optima, reuses duplicate boards, respects deadlines and validates all four objectives.');

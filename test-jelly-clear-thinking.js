'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./engine');
// Several similar attack-heavy leaders must not crowd out the defensive route.
const seeds=[{key:'attack1',obj:10,beamFamily:'attack'},{key:'attack2',obj:9,beamFamily:'attack'},{key:'shield',obj:2,beamFamily:'shield'}];
const run=preserveDiversity=>E.searchLayoutBeam(seeds,{width:2,depth:1,deadline:Infinity,preserveDiversity,
 expand:c=>c.key==='shield'?[{key:'clear',proxy:100,beamFamily:'shield'}]:[],evaluate:c=>{c.obj=100;}});
assert.equal(run(false).best.obj,10);assert.equal(run(true).best.obj,100);

const source=fs.readFileSync(require.resolve('./engine'),'utf8'),calls=[],progress=[];
const box={module:{exports:{}},performance,sample(state,arr,options){
 const attack=arr.some(p=>p.type===1),late=options.runs===500;
 if(options.seed===0xD00D)calls.push({runs:options.runs,attack});
 return {runs:options.runs,clearRate:late?(attack?.5:.8):(attack?.625:.5),medianClearTime:20,medianElapsed:30,medianHpRemaining:.2,avgPeakDps:attack?100:50};
}};
vm.runInNewContext(source.replace('function simulateMany(state,arr,options={}){','function simulateMany(state,arr,options={}){return sample(state,arr,options);'),box);
const state=E.makeState(Array.from({length:19},()=>[]));state.upgrades[0]=1;state.upgrades[1]=1;state.board[77]=0;
const options={timeMs:500,runs:24,screenRuns:2,refineRuns:2,finalists:4,damageScale:1,useSteroid:false,adaptiveClear:true,onProgress:p=>progress.push(p)};
const result=box.module.exports.optimizeTimed(state,options);
assert(result.extraClearValidation);assert.equal(result.stats.runs,500);assert.equal(result.currentStats.runs,500);
assert.equal(result.stats.clearRate,.8,'larger validation can reverse an initially lucky winner');
assert(!result.arrangement.some(p=>p.type===1));
assert.equal(calls.filter(x=>x.runs===24).length,calls.filter(x=>x.runs===500).length,'all finalists receive equal extra trials');
assert(progress.filter(p=>p.stage==='validated layout').every(p=>p.stats.runs===500),'do not present superseded small samples as final validation');
assert.equal(progress.at(-1).runs,500);
calls.length=0;
const dps=box.module.exports.optimizeTimed(state,{...options,objectiveMode:'dps'});
assert.equal(dps.stats.runs,24);assert(!dps.extraClearValidation);assert(!calls.some(c=>c.runs===500));
// Real combat: several easy-clear boards overlap in confidence. Their final
// result must still reproduce exactly after increasing the cohort to 500 runs.
const realOptions={...options,damageScale:1e8,onProgress:undefined};
const real=E.optimizeTimed(state,realOptions);
assert(real.extraClearValidation);assert.equal(real.stats.runs,500);assert.equal(real.currentStats.runs,500);
assert.deepEqual(real.stats,E.simulateMany(state,real.arrangement,{...realOptions,runs:500,seed:0xD00D,steroidStartSeconds:0}));
console.log('Clear thinking: survival diversity, close-contender rechecks, fair sample sizes, corrected previews and non-clear isolation pass.');

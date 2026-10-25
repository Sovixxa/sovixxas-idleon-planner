'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./engine');
const source=fs.readFileSync(require.resolve('./engine'),'utf8'),workerSource=fs.readFileSync(require.resolve('./solver-worker'),'utf8');
const state=E.makeState(Array.from({length:19},()=>[]));state.upgrades[0]=1;state.upgrades[16]=2;state.board[77]=0;
const current=E.arrangementFromBoard(state),other=[{type:0,anchor:95,cells:[95]}];
const stats=(runs,rate)=>({runs,clearRate:rate,medianClearTime:10,medianHpRemaining:0,avgPeakDps:1,steroidStartSeconds:null});
// A lucky small-sample Fever winner must be rechecked before comparison with
// another Fever's adaptive 500-run cohort, and cannot displace the saved board.
const calls=[],box={module:{exports:{}},performance,
 timed(st){return {current,arrangement:other,stats:stats(st.fever?500:8,st.fever?.7:.9),currentStats:stats(st.fever?500:8,.8),currentScore:E.layoutScore(st,current),score:E.layoutScore(st,other),steroidStart:null,currentSteroidStart:null};},
 sample(st,arr,opts){calls.push({fever:st.fever,runs:opts.runs,seed:opts.seed});return stats(opts.runs,E.arrangementKey(arr)===E.arrangementKey(current)?.8:.2);}
};
vm.runInNewContext(source.replace('function optimizeTimed(state,options={}){','function optimizeTimed(state,options={}){return timed(state,options);').replace('function simulateMany(state,arr,options={}){','function simulateMany(state,arr,options={}){return sample(state,arr,options);'),box);
const result=box.module.exports.optimizeOperation(state,{damageScale:1,timeMs:500});
assert.equal(result.fever,0);assert.equal(E.arrangementKey(result.arrangement),E.arrangementKey(current));
assert.equal(result.stats.clearRate,.8);assert.equal(result.currentStats.runs,500);
assert(result.feverResults.every(r=>r.stats.runs===500));assert(calls.every(c=>c.runs===500&&c.seed===0xD00D));

// Later generations search the winning Fever, but CURRENT must still describe
// the imported Fever. All generations share calibration and comparable samples.
let generation=0,calibrations=0;const trainingCalls=[],messages=[];
const fake={...E,autoDamageScale(){calibrations++;return {scale:2};},
 optimizeOperation(st,opts){generation++;trainingCalls.push({fever:st.fever,scale:opts.damageScale});return {current,arrangement:other,fever:1,currentFever:st.fever,currentStats:stats(generation===1?8:16,.1),stats:stats(generation===1?8:16,generation===1?.2:.45),damageScale:opts.damageScale,reviveDelaySeconds:0,currentSteroidStart:null,steroidStart:null,score:E.layoutScore(st,other)};},
 simulateMany(st,arr,opts){return stats(opts.runs,st.fever===0?.15:.35);}
};
const worker={self:{JellyEngine:fake},importScripts(){},postMessage:m=>messages.push(m)};vm.runInNewContext(workerSource,worker);
worker.self.onmessage({data:{job:'train',state,options:{generations:2,runs:8,useSteroid:false}}});
const trained=messages.find(m=>m.type==='result')?.value;assert(trained,JSON.stringify(messages.at(-1)));
assert.equal(calibrations,1);assert.deepEqual(trainingCalls,[{fever:0,scale:2},{fever:1,scale:2}]);
assert.equal(trained.best.currentFever,0);assert.equal(trained.best.currentStats.clearRate,.15);assert.equal(trained.best.stats.runs,trained.best.currentStats.runs);
assert.equal(trained.best.replay.steroidUsed,false);
const chosen=E.cloneState(state);chosen.fever=trained.best.fever;
assert.deepEqual(trained.best.replay,E.simulateOne(chosen,trained.best.arrangement,{damageScale:2,seed:0xD00D,useSteroid:false,steroidStartSeconds:0,reviveDelaySeconds:0,trace:true}));

// Exercise the real training worker as well: both columns must reproduce from
// their stated board, Fever, timing, calibration and the validation seed set.
const realMessages=[],real={self:{JellyEngine:E},importScripts(){},postMessage:m=>realMessages.push(m)};
vm.runInNewContext(workerSource,real);
const options={generations:2,runs:8,damageScale:1,useSteroid:false,timeMs:900,searchFever:true,screenRuns:1,refineRuns:1,finalists:1,mixLimit:12};
real.self.onmessage({data:{job:'train',state,options}});
const actual=realMessages.find(m=>m.type==='result')?.value?.best;assert(actual,JSON.stringify(realMessages.at(-1)));
const selected=E.cloneState(state);selected.fever=actual.fever;
assert.deepEqual(actual.currentStats,E.simulateMany(state,actual.current,{...options,runs:actual.stats.runs,seed:0xD00D,steroidStartSeconds:actual.currentSteroidStart??0}));
assert.deepEqual(actual.stats,E.simulateMany(selected,actual.arrangement,{...options,runs:actual.stats.runs,seed:0xD00D,steroidStartSeconds:actual.steroidStart??0}));
assert(E.timedObjective(actual.stats)>=E.timedObjective(actual.currentStats));
// Early clears contribute zero HP at the timer instead of disappearing from
// that median. A mixed sample must describe all attempts, not only survivors.
const early=E.simulateMany(state,current,{runs:8,damageScale:1e8,keepRuns:true,useSteroid:false});
assert.equal(early.clearRate,1);assert.equal(early.medianHpAtTimer,0);
assert(early.results.every(r=>r.hpAtTimer===0&&!r.criticalEntered));
const fixture=E.parseInput(fs.readFileSync('../example json.txt','utf8')),arr=E.arrangementFromBoard(fixture);
const mixed=E.simulateMany(fixture,arr,{runs:32,damageScale:4.5,useSteroid:false,keepRuns:true});
assert(mixed.normalClearRate>0&&mixed.normalClearRate<1,'fixture includes both before-timer clears and survivors');
const hp=mixed.results.map(r=>r.hpAtTimer).sort((a,b)=>a-b);
assert(hp.every(Number.isFinite));assert.equal(mixed.medianHpAtTimer,(hp[15]+hp[16])/2);
console.log('Jelly comparisons: equal Fever samples, saved-board fallback, original training baseline, fixed calibration and reproducible training replay pass.');

const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./engine');
const source=fs.readFileSync(require.resolve('./engine'),'utf8');
let now=0;const calls=[],timings=[],previews=[];
const sandbox={module:{exports:{}},performance:{now:()=>now},sample(st,arr,o){
 now+=15;calls.push({key:E.arrangementKey(arr),seed:o.seed,runs:o.runs,fever:st.fever});
 return {runs:o.runs,clearRate:0.5,medianClearTime:20,medianElapsed:100,medianHpRemaining:.5,avgPeakDps:1};
},timing(arr){timings.push(E.arrangementKey(arr));}};
vm.runInNewContext(source.replace('function simulateMany(state,arr,options={}){','function simulateMany(state,arr,options={}){return sample(state,arr,options);').replace('function optimizeSteroidStart(state,arr,options={}){','function optimizeSteroidStart(state,arr,options={}){timing(arr);'),sandbox);
const st=E.makeState(Array.from({length:19},()=>[]));st.upgrades[0]=1;st.upgrades[1]=1;st.upgrades[29]=1;st.upgrades[36]=1;st.upgrades[16]=6;st.board[77]=0;
const incumbent=E.fillEmptySlots(st,E.arrangementFromBoard(st));
const r=sandbox.module.exports.optimizeOperation(st,{timeMs:500,runs:16,mixLimit:30,shortlist:16,screenRuns:1,refineRuns:4,refineCount:4,finalists:2,timingRuns:1,timingSearch:'coarse',damageScale:1,incumbentArr:incumbent,incumbentFever:1,onProgress:p=>previews.push(p)});
const validated=new Set(calls.filter(c=>c.seed===0xD00D).map(c=>c.key));
assert(timings.length>0);assert(timings.every(k=>validated.has(k)),'only finalists receive timing optimization');
assert(validated.has(E.arrangementKey(incumbent)),'previous winner is revalidated');
assert(calls.filter(c=>c.seed===0x51A7).every(c=>c.runs===1));
assert(r.feverResults.length<r.feversRequested,'shared deadline stops new Fever searches');
assert(r.feverResults.some(x=>x.fever===1),'remembered Fever is rechecked even after the exploration budget expires');
assert(r.stats.runs===16);assert(r.stats.clearRate>=r.currentStats.clearRate);
assert(E.isLegalLayout(st,r.arrangement));
assert(previews.some(p=>p.stage==='validated layout'));
const messages=[],worker={self:{JellyEngine:E},Date:{now:()=>now},importScripts(){},postMessage:m=>messages.push(m)};
vm.runInNewContext(fs.readFileSync(require.resolve('./solver-worker'),'utf8'),worker);
const reporter=worker.progressReporter('chance');now=0;
for(let i=1;i<=50;i++){now+=10;reporter.report({stage:'testing layouts',arrangement:incumbent,stats:{clearRate:i/100,medianClearTime:20}});}
reporter.flush(true);
const boards=messages.map(m=>m.progress);assert(boards.length<=5,'board messages are throttled');assert.equal(boards.at(-1).stats.clearRate,.5,'last pending best is flushed');
reporter.report({stage:'testing layouts',arrangement:incumbent,stats:{clearRate:.1,medianClearTime:20}});reporter.flush(true);assert.equal(messages.length,boards.length,'weaker previews are suppressed');
console.log('Speed regressions pass: cheap screens, finalist-only timing, incumbent validation, shared deadline, throttled best previews and final flush.');
// Quick timing must retain an exact remembered winner outside its coarse grid.
const rememberedSandbox={module:{exports:{}},performance,sample(st,arr,o){return {runs:1,clearRate:o.steroidStartSeconds===17?1:0,medianElapsed:30,medianClearTime:20,medianHpRemaining:.5,avgPeakDps:1};}};
vm.runInNewContext(source.replace('function simulateMany(state,arr,options={}){','function simulateMany(state,arr,options={}){return sample(state,arr,options);'),rememberedSandbox);
assert.equal(rememberedSandbox.module.exports.optimizeSteroidStart(st,incumbent,{runs:1,timingSearch:'coarse',incumbentSteroidStart:17}).start,17);
// Mandatory coverage survives an already-expired budget for every objective.
// Exercise packed full boards, fragmented unlocks and a remembered layout.
const coverageCalls=[],coverageBox={module:{exports:{}},performance:{now:()=>1000},sample(st,arr,o){
 assert(E.isLegalLayout(st,arr),'coverage candidates must respect shapes and Virus capacity');
 if(o.seed===0x51A7)coverageCalls.push(arr);
 return {runs:o.runs,clearRate:.5,medianClearTime:20,medianElapsed:20,medianHpRemaining:.5,avgPeakDps:1,avgBloodcells:1,avgCellLevelsGained:1,avgCellLevelProgress:1};
}};
vm.runInNewContext(source.replace('function simulateMany(state,arr,options={}){','function simulateMany(state,arr,options={}){return sample(state,arr,options);'),coverageBox);
for(const full of [false,true])for(const objectiveMode of ['chance','dps','bloodcells','cellExp']){
 const state=E.makeState(Array.from({length:19},()=>[]));state.upgrades.fill(1,0,8);
 if(full)state.plots=Array.from({length:E.PLOTS.length},(_,i)=>i);
 const saved=E.fillEmptySlots(state,[]);state.board.fill(-1);for(const p of saved)state.board[p.anchor]=p.type;
 const before=JSON.stringify(state);coverageCalls.length=0;
 coverageBox.module.exports.optimizeTimed(state,{deadline:0,timeMs:500,runs:8,damageScale:1,useSteroid:false,objectiveMode,incumbentArr:saved,screenRuns:1,refineRuns:1,finalists:1});
 const expected=[...new Set(E.placementsForState(state).filter(p=>p.type!==5||E.virusLimit(state)>0).map(p=>p.type))].sort();
 const seen=[...new Set(coverageCalls.flatMap(a=>a.map(p=>p.type)))].sort();
 assert.deepEqual(seen,expected,'all usable unlocked types are actually simulated despite expired budget: '+objectiveMode+'/'+full);
 assert.equal(JSON.stringify(state),before,'coverage preserves imported state');
}
console.log('Mandatory cell-type coverage passes all four goals on packed and fragmented boards with an expired deadline.');

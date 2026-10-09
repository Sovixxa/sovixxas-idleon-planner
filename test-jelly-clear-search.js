'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./engine');
const source=fs.readFileSync(require.resolve('./engine'),'utf8');
const state=E.makeState(Array.from({length:19},()=>[]));
state.upgrades[0]=1;state.upgrades[1]=1;state.upgrades[16]=2;
state.board[77]=0;
// Deliberately noisy screen: all unrefined boards look better than the
// independently rechecked cohort. They must not jump straight to validation.
const calls=[],calibrations=[];
const sandbox={module:{exports:{}},performance,
  sample(st,arr,opts){
    const key=E.arrangementKey(arr);calls.push({key,seed:opts.seed,runs:opts.runs,scale:opts.damageScale,fever:st.fever});
    return {runs:opts.runs,clearRate:opts.seed===0x51A7?1:0.25,medianClearTime:10,avgPeakDps:1,medianHpRemaining:0.5};
  },
  calibrate(st){calibrations.push(st.fever);return {scale:2+st.fever,source:'savedBestDps'};}
};
vm.runInNewContext(source
  .replace('function simulateMany(state,arr,options={}){','function simulateMany(state,arr,options={}){return sample(state,arr,options);')
  .replace('function autoDamageScale(state,arr){','function autoDamageScale(state,arr){return calibrate(state);'),sandbox);
const instrumented=sandbox.module.exports;
const opts={timeMs:500,runs:24,mixLimit:50,shortlist:16,screenRuns:3,refineRuns:8,refineCount:4,finalists:4,useSteroid:false};
instrumented.optimizeTimed(state,{...opts,damageScale:1});
const refined=calls.filter(c=>c.runs===8),validated=calls.filter(c=>c.runs===24);
assert.equal(refined.length,4);
assert.equal(new Set(refined.map(c=>c.seed)).size,1,'rechecked boards share the same random seed set');
const eligible=new Set([...refined.map(c=>c.key),E.arrangementKey(E.arrangementFromBoard(state)),E.arrangementKey(E.fillEmptySlots(state,E.arrangementFromBoard(state)))]);
assert(validated.every(c=>eligible.has(c.key)),'unrechecked screening winners cannot bypass refinement');
calls.length=0;
const result=instrumented.optimizeOperation(state,opts);
assert.deepEqual(calibrations,[state.fever],'calibration happens once against the saved Fever');
assert.equal(new Set(calls.map(c=>c.fever)).size,2);
assert(calls.every(c=>c.scale===2+state.fever),'every Fever uses one damage calibration');
assert.equal(result.calibration.source,'savedBestDps');

// Exercise the actual worker and combat engine: the displayed replay must be
// the first validation run of the chosen board, Fever, timing and revive delay.
state.upgrades[29]=1;
for(const useSteroid of [false,true]){
  const messages=[],worker={self:{JellyEngine:E},importScripts(){},postMessage:x=>messages.push(x)};
  vm.runInNewContext(fs.readFileSync(require.resolve('./solver-worker'),'utf8'),worker);
  const settings={...opts,runs:8,damageScale:1,searchFever:false,useSteroid,reviveDelaySeconds:0.12};
  worker.self.onmessage({data:{job:'optimize',state,options:settings}});
  const done=messages.find(x=>x.type==='result');assert(done,JSON.stringify(messages.at(-1)));
  const value=done.value,chosen=E.cloneState(state);chosen.fever=value.fever;
  assert(E.isLegalLayout(chosen,value.arrangement));
  const validation=E.simulateMany(chosen,value.arrangement,{...settings,seed:0xD00D,steroidStartSeconds:value.steroidStart??0});
  assert.deepEqual(value.stats,validation,'reported scores reproduce for the selected board');
  const replay=E.simulateOne(chosen,value.arrangement,{...settings,seed:0xD00D,steroidStartSeconds:value.steroidStart??0,trace:true});
  assert.deepEqual(value.replay,replay,'worker replay uses the winning simulation settings');
  assert(E.timedObjective(value.stats)>=E.timedObjective(value.currentStats));
}
console.log('Jelly clear search: fair refinement, shared Fever calibration, legal winner, reproducible scores and worker replay pass.');

// Completion cannot move existing shapes or alter locked squares. Every new
// clear trial is full; saved partial boards remain explicit baseline controls.
const partial=E.arrangementFromBoard(state),full=E.fillEmptySlots(state,partial);
assert(E.isLegalLayout(state,full));
assert.equal(E.layoutScore(state,full).filledSlots,E.unlockedSlots(state).size);
assert(partial.every(p=>full.some(q=>p.type===q.type&&p.anchor===q.anchor)));
const original=JSON.stringify(state),seen=[];
const completion=E.optimizeTimed(state,{...opts,damageScale:1,onProgress:p=>{if(p.arrangement)seen.push(p.arrangement);}});
assert(seen.length>0);
assert(seen.every(arr=>E.arrangementKey(arr)===E.arrangementKey(partial)||E.layoutScore(state,arr).filledSlots===E.unlockedSlots(state).size));
assert.equal(JSON.stringify(state),original,'search preserves the save');
assert(completion.stats.clearRate>=completion.currentStats.clearRate);
const unlocked=E.cloneState(state);unlocked.plots=Array.from({length:E.PLOTS.length},(_,i)=>i);unlocked.upgrades.fill(1,0,8);unlocked.upgrades[14]=1;
const idx=E.buildPlacementIndex(unlocked);
for(const type of [0,1,2,3])for(const count of [3,6,9]){
 const board=E.generateBreakpointLayout(unlocked,idx,E.seededRng(100+type+count),type,count);
 assert(E.isLegalLayout(unlocked,board));assert(E.rawCounts(board)[type]>=count,'explicit breakpoint seed '+type+'/'+count);
}
// Filling holes must not freeze the placement search: larger shapes can trade
// positions with Amoeba fillers without changing cell counts or occupancy.
const seed=E.fillEmptySlots(unlocked,[{type:3,anchor:38,cells:E.footprint(3,38)}]);
let moved=false;
for(let n=1;n<=200&&!moved;n++){
 const next=E.relocateLayout(unlocked,idx,E.seededRng(n*7919),seed);
 assert(E.isLegalLayout(unlocked,next));assert.deepEqual(E.rawCounts(next),E.rawCounts(seed));
 assert.equal(E.layoutScore(unlocked,next).filledSlots,idx.slots.length);
 moved=E.arrangementKey(next)!==E.arrangementKey(seed);
}
assert(moved,'full boards still explore alternative support positions');
const improved=E.localImproveLayout(unlocked,idx,E.seededRng(91),seed,1);
assert(E.isLegalLayout(unlocked,improved));assert.deepEqual(E.rawCounts(improved),E.rawCounts(seed));
assert(E.layoutScore(unlocked,improved).withJellyUpgrades>=E.layoutScore(unlocked,seed).withJellyUpgrades);
console.log('Jelly occupancy audit: full clear candidates, preserved baseline/save, 3/6/9 seeds and full-board relocation pass.');

// The ability remains usable in Critical Condition, beyond the normal timer.
const critical=E.cloneState(state);critical.upgrades[36]=1;
const starts=E.steroidStartCandidates(critical,100);
assert(starts.some(t=>t>E.bossTime(critical.obstruction)));
assert(starts.includes(95));assert(starts.length<25,'timing search remains bounded');
critical.upgrades[36]=0;
assert(E.steroidStartCandidates(critical,100).every(t=>t<E.bossTime(critical.obstruction)));
// A synthetic late-winning scenario proves those starts reach the optimizer.
const timingSandbox={module:{exports:{}},performance,lateSample(st,arr,opts){return {runs:opts.runs,medianElapsed:100,clearRate:opts.steroidStartSeconds>=60?1:0,medianClearTime:95,avgPeakDps:1,medianHpRemaining:0.5};}};
vm.runInNewContext(source.replace('function simulateMany(state,arr,options={}){','function simulateMany(state,arr,options={}){return lateSample(state,arr,options);'),timingSandbox);
critical.upgrades[36]=1;
assert(timingSandbox.module.exports.optimizeSteroidStart(critical,full,{runs:3}).start>=60);
console.log('Jelly skill audit: Stronkroid search includes Critical Condition.');

// Huge banked EXP must not inflate a single attempt's damage or passives.
const banked=E.cloneState(unlocked),emptyExp=E.cloneState(unlocked);
banked.cellExp.fill(1e20);emptyExp.cellExp.fill(0);
const battle={seed:992,damageScale:0.000001,useSteroid:false};
const withBank=E.simulateOne(banked,seed,battle),withoutBank=E.simulateOne(emptyExp,seed,battle);
assert.equal(withBank.totalDamage,withoutBank.totalDamage);
assert.deepEqual(withBank.runtimeLevels,banked.cellLevels);assert.equal(withBank.levelsGained,0);
// Three Immunoids get a fourth effective count, but never an extra physical
// shield, attacker or revive. Critical still destroys only their 12 real squares.
const shieldState=E.cloneState(unlocked);shieldState.obstruction=23;shieldState.upgrades[36]=1;
const shields=[18,20,22].map(anchor=>({type:4,anchor,cells:E.footprint(4,anchor)}));
assert.equal(E.combatModel(shieldState,shields).effectiveCounts[4],4);
assert.equal(E.combatModel(shieldState,shields).units.length,3);
const shieldRun=E.simulateOne(shieldState,shields,{...battle,trace:true});
assert.equal(shieldRun.events.filter(e=>e.type==='death'&&e.immunoid).length,12);
console.log('Jelly combat audit: banked EXP cannot inflate damage; Cells of Three does not create extra attackers or shields.');

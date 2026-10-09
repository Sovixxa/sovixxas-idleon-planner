'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./engine');
const state=E.parseInput(fs.readFileSync('../example json.txt','utf8'));
const arr=E.arrangementFromBoard(state),before=JSON.stringify(state);
assert(E.steroidUnlocked(state));
const settings={runs:12,seed:0x51A7,damageScale:1,keepRuns:true,trace:true};
const off=E.simulateMany(state,arr,{...settings,useSteroid:false});
const on=E.simulateMany(state,arr,{...settings,useSteroid:true,steroidStartSeconds:15});
assert.equal(off.steroidUses,0);assert.equal(off.steroidStartSeconds,null);
assert.equal(on.steroidUses,12);assert.equal(on.steroidStartSeconds,15);
for(const result of on.results){
 const events=result.events.filter(e=>e.type==='steroid');
 assert.equal(events.length,1,'one activation per attempt');
 assert.equal(events[0].time,15);assert.equal(events[0].durationSeconds,5);
 assert.equal(events[0].multiplier,1+(50+E.upgradeQty(state,29))/100);
 assert(result.trace.find(p=>p.time===15).steroid);
 assert(result.trace.find(p=>p.time===19).steroid);
 assert(!result.trace.find(p=>p.time===20).steroid);
}
const damage=stats=>stats.results.reduce((sum,r)=>sum+r.totalDamage,0)/stats.runs;
assert(damage(on)>damage(off),'ability actually increases damage in matched attempts');
const locked=E.cloneState(state);locked.upgrades[29]=0;
assert.equal(E.simulateMany(locked,arr,{...settings,runs:1}).steroidUses,0);
const tooLate=E.simulateMany(state,arr,{...settings,runs:1,steroidStartSeconds:1e6});
assert.equal(tooLate.steroidUses,0,'scheduled but unreached ability is not reported as activated');
assert.equal(JSON.stringify(state),before);

// A board requiring a delayed burst must not be scored using an immediate-only
// trial before it ever reaches the final timing optimizer.
const source=fs.readFileSync(require.resolve('./engine'),'utf8'),calls=[],previews=[];
const sandbox={module:{exports:{}},performance,sample(st,board,opts){
 const start=opts.steroidStartSeconds??0;
 calls.push({key:E.arrangementKey(board),seed:opts.seed,start,runs:opts.runs});
 return {runs:opts.runs,clearRate:start>=12?1:0,medianClearTime:100,medianElapsed:100,
  medianHpRemaining:start>=12?0:0.5,avgPeakDps:1,steroidStartSeconds:start,steroidUses:opts.runs};
}};
vm.runInNewContext(source.replace('function simulateMany(state,arr,options={}){','function simulateMany(state,arr,options={}){return sample(state,arr,options);'),sandbox);
const small=E.makeState(Array.from({length:19},()=>[]));
small.upgrades[0]=1;small.upgrades[1]=1;small.upgrades[29]=1;small.upgrades[36]=1;
sandbox.module.exports.optimizeTimed(small,{timeMs:500,runs:24,screenRuns:3,refineRuns:8,refineCount:4,shortlist:16,mixLimit:50,damageScale:1,onProgress:p=>{if(p.stage==='testing layouts')previews.push(p);}});
const screens=new Map();for(const c of calls.filter(c=>c.seed===0x51A7)){
 if(!screens.has(c.key))screens.set(c.key,new Set());screens.get(c.key).add(c.start);
}
assert(screens.size>1);
for(const starts of screens.values()){
 assert(starts.has(0));assert([...starts].some(t=>t>=12&&t<E.bossTime(small.obstruction)));
 assert([...starts].some(t=>t>E.bossTime(small.obstruction)));
 assert(starts.size<=5,'coarse screening has a bounded timing budget');
}
assert(previews.length>0&&previews.every(p=>p.stats.steroidStartSeconds>=12));
assert(calls.filter(c=>c.seed===0x9EED).every(c=>c.start>=12),'refinement uses the trained activation time');
assert(calls.filter(c=>c.seed===0xD00D).every(c=>c.start>=12),'validation uses the trained activation time');
console.log('Stronkroid audit passes: activation, five-second speed boost, delayed screening, refinement, validation, locked/disabled and unreached cases.');
console.log(JSON.stringify({attempts:12,activated:on.steroidUses,startSeconds:on.steroidStartSeconds,speedMultiplier:1+(50+E.upgradeQty(state,29))/100,meanDamageWithout:damage(off),meanDamageWith:damage(on)}));

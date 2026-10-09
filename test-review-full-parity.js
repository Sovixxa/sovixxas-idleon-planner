'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const c={console:{log(){},warn(){},error(){},debug(){}}};c.self=c;vm.createContext(c);vm.runInContext('structuredClone=v=>JSON.parse(JSON.stringify(v))',c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c));c.postMessage=()=>{};c.importScripts('review-target-worker.js');const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(raw),s=c.ReviewTargetModel.session(raw),p=s.parse(raw.data),M=c.PrayerMath;


const build=c.ReviewTargetSources.build,evaluated=new Set(),originalEvaluate=c.ReviewTargetMetrics.evaluate;
c.ReviewTargetMetrics.evaluate=(...args)=>{evaluated.add(args[2]);return originalEvaluate(...args);};
c.ReviewTargetSources.build=(...args)=>{const r=build(...args);return {...r,candidates:r.candidates.filter(x=>x.system==='Stamps'&&/Sword|Cooked Meal|Golden Apple/.test(x.name)||x.system==='Meals'&&x.path[2]<2||x.system==='Golden food'&&x.foodSlot<2)};};
for(const [id,metric,target] of [['all','kitchens',1e200],['all','damage',.000001],['0','damage',1e100]]){
 evaluated.clear();const parallel=c.ReviewTargetModel.session(raw),context=parallel.prepareFull(id,metric,target,{});
 assert(context.candidates.length>0);const workerSession=c.ReviewTargetModel.session(raw);
 const results=context.candidates.map(x=>workerSession.compareCandidate(context,x));
 parallel.acceptFull(context,[results[0]]);assert.equal(parallel.prepareFull(id,metric,target,{}).candidates.length,context.candidates.length-1,'Resume omits completed comparisons');
 parallel.acceptFull(context,c.structuredClone([...results].reverse()));
 const result=id==='all'?parallel.accountWide('plan',metric,target):parallel.plan(id,metric,target);
 const cold=c.ReviewTargetModel.session(raw),expected=id==='all'?cold.accountWide('plan',metric,target):cold.plan(id,metric,target);
 const normalize=x=>{const r=x.accountWide?x.results[0].result:x;return JSON.stringify({before:r.before,after:r.after,options:r.options,steps:r.steps,issues:r.issues});};
 assert.deepEqual([...evaluated],[metric],'No speculative evaluation of other metrics');
 assert.equal(normalize(result),normalize(expected),metric+' parallel arrival order preserves exact sequential results');
 const iterator=parallel.fullRoute(id,metric,target,{},()=>{},8);let next=iterator.next(),batches=0;
 while(!next.done){const q=next.value;assert(q.candidates.length<=8);batches++;next=iterator.next(q.candidates.map(candidate=>workerSession.routeCandidate(c.structuredClone(q),c.structuredClone(candidate))));}
 assert.equal(normalize(next.value),normalize(expected),metric+' parallel combined route preserves all cumulative steps and comparisons');
 if((result.accountWide?result.results[0].result:result).steps.length>1)assert(batches>0,'Cumulative interactions must use the route workers');
 assert.equal(parallel.prepareFull(id,metric,target,{}).candidates.length,0,'Completed comparisons are reused');
 const tested=(result.accountWide?result.results[0].result:result).tested;parallel.acceptFull(context,results);const again=id==='all'?parallel.accountWide('plan',metric,target):parallel.plan(id,metric,target);assert.equal((again.accountWide?again.results[0].result:again).tested,tested,'Duplicate worker replies are not counted twice');
}
assert.equal(JSON.stringify(raw),original);console.log('Parallel/sequential parity, out-of-order and duplicate replies, completed-scan reuse and save immutability passed.');

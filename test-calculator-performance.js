'use strict';
// Native parity and work-count regression. No wall-clock threshold: shared CI
// machines vary, but repeating a shared upgrade parse for every character is a bug.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(raw);
const c={console:{log(){},debug(){},warn(){},error(){}}};c.self=c;c.window=c;vm.createContext(c);
vm.runInContext('structuredClone=v=>JSON.parse(JSON.stringify(v))',c);
c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));c.postMessage=()=>{};c.importScripts('review-target-worker.js');
let parses=0;const M={...c.PrayerMath,parseData(...args){parses++;return c.PrayerMath.parseData(...args);}},T=c.ReviewTargetMetrics;
const session=c.ReviewTargetModel.session(raw,M),p=session.parse(raw.data);
// Simulation reconstruction must retain every numeric input and unknown-source
// check while avoiding locale formatting for rows that the caller discards.
vm.runInContext('globalThis.formatCalls=0;const originalFormat=Number.prototype.toLocaleString;Number.prototype.toLocaleString=function(...args){formatCalls++;return originalFormat.apply(this,args);}',c);
for(const ch of p.characters){
 const detailed=c.ConnectedPrimaryStats.calculate(ch,p.account,p.characters,M);
 const start=c.formatCalls,compact=c.ConnectedPrimaryStats.calculate(ch,p.account,p.characters,M,false);
 assert.equal(c.formatCalls,start,'Simulation primary stats must not format display values');
 const numeric=rows=>JSON.stringify(rows.map(({rows,...rest})=>({...rest,rows:rows.map(({display,detail,...row})=>row)})));
 assert.equal(numeric(compact),numeric(detailed),'Every primary-stat term and validation result must match');
 assert(detailed.some(stat=>stat.rows.some(row=>row.display?.endsWith('%'))),'Default display breakdown remains formatted');
}
const build=c.ReviewTargetSources.build;
const countBefore=parses,overview=session.accountWide('describe','damage',null,{yieldPerHour:0});
assert(overview.sharedGain&&overview.accountWide);assert.equal(overview.results.length,1);assert.equal(overview.value,0);assert.equal(overview.unit,'% gain');assert(parses<=countBefore+1,'Shared plan baseline reuses one parse');
assert(!overview.sources&&!overview.overview,'Shared scope is a working calculator');const sharedTotal=session.accountWide('describe','research');assert.equal(sharedTotal.results.length,1);console.log('Account Wide has one shared-upgrade plan; actual shared totals are counted once.');
// Drop Rate retains only compact exact-scenario projections, shared across plans.
c.importScripts('drop-rate-model.js','drop-source-info.js','drop-target-model.js');const drBuild=c.DropTargetSources.build;c.DropTargetSources.build=(...args)=>{const r=drBuild(...args);return {...r,candidates:r.candidates.filter(u=>u.id==='food-fill'||u.name.startsWith('Mason Jar')||u.path[0]==='UpgVault').slice(0,4)};};
const target=1e100,normalize=r=>JSON.stringify({before:r.before,after:r.after,steps:r.steps,options:r.options,issues:r.issues});
const shared=c.DropTargetModel.session(raw,M);const a=c.DropTargetModel.plan(raw,0,target,M,()=>{},shared);const count=parses;const repeat=c.DropTargetModel.plan(raw,0,target,M,()=>{},shared);assert.equal(parses,count,'Repeated target must not reparse cached scenarios');assert.equal(normalize(a),normalize(repeat));
const second=c.DropTargetModel.plan(raw,1,target,M,()=>{},shared),fresh=c.DropTargetModel.plan(raw,1,target,M);assert.equal(normalize(second),normalize(fresh),'Shared DR projections must match a cold character plan');
const changed=structuredClone(raw);const food=shared.inspect(raw.data).foods['0'];assert(!food.missing&&food.amount>1);c.DropTargetSources.set(changed.data,food.path,1);const freshSession=c.DropTargetModel.session(changed,M);assert.equal(freshSession.inspect(changed.data).foods['0'].amount,1);assert.equal(shared.inspect(raw.data).foods['0'].amount,food.amount,'A changed import cannot contaminate the earlier cache');assert.equal(JSON.stringify(raw),original);console.log('Drop Rate: exact cache reuse, cold-plan parity, separate imports and save immutability passed.');

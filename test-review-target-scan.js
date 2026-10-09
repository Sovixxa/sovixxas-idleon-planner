'use strict';
// Optional exhaustive native scenario audit. Shards are independent processes;
// every milestone still runs through the complete account parser and all metrics.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const shard=Number(process.argv[2]||0),shards=Number(process.argv[3]||1);
assert(Number.isInteger(shard)&&Number.isInteger(shards)&&shard>=0&&shard<shards);
const c={console:{log(){},warn(){},error(){},debug(){}}};c.self=c;vm.createContext(c);
vm.runInContext('structuredClone=v=>JSON.parse(JSON.stringify(v))',c);
c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));c.postMessage=()=>{};c.importScripts('review-target-worker.js');
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(raw),M=c.PrayerMath,T=c.ReviewTargetMetrics;
const session=c.ReviewTargetModel.session(raw),p=session.parse(raw.data),built=c.ReviewTargetSources.build(p,raw.data,0,M),ch=p.characters[0];
const cap=Math.floor(Math.max(M.getItemCapacity('cFood',ch,p.account,false).value,M.getItemCapacity('cFood',{...ch,mapIndex:0},p.account,false).value));
const metrics=T.metrics.filter(m=>!m.measured&&!m.id.startsWith('unlock:'));
const baseline=Object.fromEntries(metrics.map(m=>[m.id,T.evaluate(p,0,m.id,raw.data,M).value]));
const selected=built.candidates.filter((_,i)=>i%shards===shard),results=[],errors=[];
for(const [i,u] of selected.entries()){
 try{const test=session.simulate(raw.data,u,0,'damage',{},cap),gains={};for(const m of metrics){const value=T.evaluate(test.p,0,m.id,test.changed,M).value;assert(Number.isFinite(value)&&value>=0);if(value!==baseline[m.id])gains[m.id]=value/baseline[m.id]-1;}results.push({id:u.id,name:u.name,system:u.system,gains});}
 catch(e){errors.push({id:u.id,name:u.name,error:e.message});}
 if((i+1)%25===0||i+1===selected.length)console.log(`Shard ${shard+1}/${shards}: ${i+1}/${selected.length} scenarios, ${errors.length} errors`);
}
assert.equal(JSON.stringify(raw),original);
fs.writeFileSync(`../audit/review-target-scan-${shard}.json`,JSON.stringify({shard,shards,total:built.candidates.length,metrics:metrics.map(m=>m.id),baseline,results,errors},null,2));
assert.equal(errors.length,0,JSON.stringify(errors));
console.log(`Full scenario shard ${shard+1}/${shards} passed.`);

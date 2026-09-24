'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={console:{log(){},warn(){},error(){}},structuredClone};c.window=c;c.self=c;vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));let result;c.postMessage=x=>result=structuredClone(x);c.importScripts('gold-food-worker.js');
const raw=JSON.parse(fs.readFileSync('../example json.txt'));c.onmessage({data:raw});assert(!result.error,result.error);const best=result.values.reduce((a,b)=>a.percent>b.percent?a:b);
assert(Math.abs(best.percent-177064.35821249807)<.01);const b=best.breakdown;
assert.equal(b.meals[0].mastery,37);assert.equal(b.meals[0].level,145);assert.equal(b.meals[0].ribbon,24);
assert.equal(b.outer,1.75);assert.equal(b.sources.find(x=>x.name==='Jelly Operator').value,100);
for(const x of result.values){assert(Math.abs(x.breakdown.sources.reduce((sum,s)=>sum+s.contribution,0)+x.breakdown.baselineContribution-x.percent)<1e-6);}
const Bean=require('./beanstalk.js');assert.equal(Bean.gameTotal(best.percent),'178K');
// The game's ceiling display changes exactly at whole-thousand boundaries.
assert.equal(Bean.gameTotal(177000),'177K');assert.equal(Bean.gameTotal(177000.01),'178K');
// No cooking mastery must reduce the independently parsed cooking contribution.
const copy=structuredClone(raw),master=JSON.parse(copy.data.CookMaster);master[0][64]=0;copy.data.CookMaster=JSON.stringify(master);c.onmessage({data:copy});assert(!result.error,result.error);const without=result.values.find(x=>x.id===best.id).breakdown.sources.find(x=>x.name==='Meal').value;
assert(Math.abs(b.sources.find(x=>x.name==='Meal').value/without-(1+37/42))<1e-9);
console.log('Golden Food: all source totals reconcile; mastery applied once; combined multipliers, Jelly reward and 178K display verified.');

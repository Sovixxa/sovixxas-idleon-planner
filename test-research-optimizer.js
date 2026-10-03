'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('./research-optimizer-model');
assert(!M.neighbors(7,8,80).includes(8));assert(!M.neighbors(19,20,240).includes(20));assert.equal(M.coord(106),'F7');
const nodes=Array.from({length:240},(_,index)=>({index,name:'Node',level:0,canSelect:false,maxLv:1}));nodes[109].canSelect=true;
assert.deepEqual(M.pathTo(nodes,111),[109,110,111]);nodes[110].name='Name';assert(!M.pathTo(nodes,111).includes(110));
const state={magnifiersOwned:3,magnifyingGlassOwned:2,opticalMonocleOwned:0,kaleidoscopeOwned:1,magnifiersPerSlot:2,kaleiBase:1,observations:[{index:7,found:true,unlocked:true,unitExp:10,unitInsight:1,insightExpREQ:1},{index:8,found:true,unlocked:true,unitExp:20,unitInsight:1,insightExpREQ:1},{index:9,found:true,unlocked:true,unitExp:1,unitInsight:1,insightExpREQ:1}]};
const lens=M.lensPlan(state,[],{goal:'exp'});assert(lens.after.exp>=40);assert(lens.assignments.filter(x=>x.obs===8).length<=2);assert.equal(M.lensRates(state,[{type:0,obs:7},{type:2,obs:8}]).exp,10);
const box={console,structuredClone};vm.createContext(box);box.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(file,'utf8'),box));let response;box.postMessage=r=>response=r;vm.runInContext(fs.readFileSync('research-optimizer-worker.js','utf8'),box);
const save=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(save);box.onmessage({data:{raw:save}});assert(!response.error,response.error);const decoded=response.result;
box.onmessage({data:{action:'lenses',config:{goal:'exp'}}});assert(!response.error,response.error);assert(Math.abs(response.result.before.exp-decoded.researchEXPrateTOT)<.001);assert(response.result.after.exp>=response.result.before.exp-.001);assert.equal(response.result.unplaced,0,'unused lens types should still be placed when slots are available');
const counts=new Map();for(const a of response.result.assignments){if(a.obs<0)continue;counts.set(a.obs,(counts.get(a.obs)||0)+1);assert(decoded.observations.find(o=>o.index===a.obs)?.found);}assert([...counts.values()].every(n=>n<=decoded.magnifiersPerSlot));assert(JSON.stringify(save)===original,'input save must be unchanged');
const mutable=structuredClone(save),raw=typeof mutable.data.Research==='string'?JSON.parse(mutable.data.Research):mutable.data.Research;raw[0][70]=0;mutable.data.Research=raw;
box.onmessage({data:{raw:mutable}});assert(!response.error,response.error);assert(response.result.gridPTSavailable>=4);
box.onmessage({data:{action:'grid',config:{budget:4,goal:'exp'}}});assert(!response.error,response.error);assert(response.result.plan.length>0);assert(response.result.spent<=4+response.result.earned);assert(response.result.after>response.result.before);assert(response.result.left>=0);
box.onmessage({data:{action:'grid',config:{budget:0,goal:'exp'}}});assert.equal(response.result.plan.length,0);
box.onmessage({data:{action:'grid',config:{budget:1,goal:'target',target:70}}});assert.equal(response.result.plan.length,1);assert.equal(response.result.plan[0].id,70);
console.log('Research optimizer: legal routes, no row wrapping, lens ownership/caps, exact baseline rates, real-save plans, budgets and non-mutation pass.');

const refundRaw=[Array(240).fill(0)];refundRaw[0][70]=1;
const evalRefund=raw=>{const level=raw[0],spent=level.reduce((a,b)=>a+b,0),earned=2+8*level[50];return {gridPTSavailable:earned-spent,gridPTSearned:earned,researchEXPrateTOT:1+level[50]+level[70],observations:[],gridSquares:Array.from({length:240},(_,index)=>({index,name:[50,70].includes(index)?'Research':'Name',level:level[index],maxLv:index===50?1:10,canSelect:[50,70].includes(index)}))};};
const refund=M.gridPlan(refundRaw,evalRefund,{goal:'exp',budget:1});assert.equal(refund.earned,8);assert.equal(refund.spent,9);assert.equal(refund.left,0);assert.equal(refundRaw[0][50],0);
console.log('Research point-generation purchase extends the legal budget without mutating input.');

box.onmessage({data:{raw:save}});const actual=response.result;
const assignments=Array.from({length:actual.magnifiersOwned},(_,i)=>{const r=typeof save.data.Research==='string'?JSON.parse(save.data.Research):save.data.Research;return {type:r[5][4*i+3],obs:r[5][4*i+2]};});
const actualRates=M.lensRates(actual,assignments);
const actualProgress=actual.observations.reduce((sum,o)=>sum+(o.found&&o.unlocked?o.realInsightExpRate/Math.max(1,o.insightExpREQ):0),0);
assert(Math.abs(actualRates.insight-actualProgress)<1e-8,'lens baseline matches actual Insight accrual');
for(const goal of ['insight','balanced']){box.onmessage({data:{action:'lenses',config:{goal}}});assert(!response.error,response.error);if(goal==='insight')assert(response.result.after.insight>=response.result.before.insight-1e-9);}
const pureExp=raw=>({...evalRefund(raw),observations:[{realInsightExpRate:3,insightExpRate:3*(1+raw[0][70]),insightExpREQ:10}]});
assert.equal(M.gridPlan(refundRaw,pureExp,{goal:'insight',budget:1}).spent,0,'display-only Insight multiplier must not justify spending');
assert.equal(M.gridPlan(refundRaw,r=>({...evalRefund(r),canUpgradeGrid:false}),{goal:'exp',budget:1}).spent,0,'tutorial gate prevents purchasing');
assert.equal(M.lensPlan({...state,observations:[]},[],{goal:'balanced'}).unplaced,3);
console.log('Actual Insight rates, both additional goals, tutorial gate and empty board pass.');

// A partially reconciled save must never advertise or spend negative points.
box.onmessage({data:{raw:save}});const normalPoints=response.result.gridPTSavailable;
const deficitSave=structuredClone(save),deficitResearch=typeof deficitSave.data.Research==='string'?JSON.parse(deficitSave.data.Research):deficitSave.data.Research;
deficitResearch[0][0]+=normalPoints+1;deficitSave.data.Research=deficitResearch;
box.onmessage({data:{raw:deficitSave}});assert(!response.error,response.error);
assert.equal(response.result.gridPTSbalance,-1);assert.equal(response.result.gridPTSavailable,0);
box.onmessage({data:{action:'grid',config:{budget:20,goal:'exp'}}});assert(!response.error,response.error);assert.equal(response.result.plan.length,0);assert.equal(response.result.spent,0);assert.equal(response.result.left,0);
console.log('Negative Research point balance is retained for diagnostics, displayed as zero spendable, and cannot fund a purchase.');

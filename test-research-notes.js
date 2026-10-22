const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),N=require('./research-notes-model'),L=require('./research-optimizer-model');
const o={found:true,unlocked:true,canLevelUp:true,insightExpREQ:100,insightExp:20};
assert.deepEqual(N.timing(o,4),{remaining:80,hours:20,notes:10,status:'Progressing'});
assert.equal(N.timing({...o,insightExp:19},4).notes,11);
assert.equal(N.timing({...o,insightExp:100},0).notes,0);
assert.equal(N.timing(o,0).notes,null);
assert.equal(N.timing(o,1e20).notes,1,'any positive remaining progress needs at least one Note');
assert.equal(N.timing({...o,found:false},4).hours,null);
assert.equal(N.timing({...o,canLevelUp:false},4).notes,null);
assert(N.canLevel({canLevelUpObservations:true},{...o,researchLvReq:999}),'found and available observations can level without rechecking catalog discovery level');
const box={console,structuredClone};vm.createContext(box);box.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),box));let response;box.postMessage=r=>{if(!r.progress)response=r;};vm.runInContext(fs.readFileSync('research-optimizer-worker.js','utf8'),box);
const save=JSON.parse(fs.readFileSync('../example json.txt','utf8')),snapshot=JSON.stringify(save);
box.onmessage({data:{raw:save,action:'notes',config:{goal:'insight'}}});assert(!response.error,response.error);const plan=response.result;
assert.equal(plan.noteHours,2);assert(Object.keys(plan.focusEstimates).length>10);
for(const row of plan.rows.filter(o=>o.canLevelUp)){const e=plan.focusEstimates[row.index];assert(e);if(e.notes!==null){assert.equal(e.notes,Math.ceil(e.hours/2-1e-12));assert(e.notes*2*e.rate>=e.remaining-1e-9);}}
assert(plan.rows.some(o=>o.notes>0));assert(plan.after.insight>=plan.before.insight);
for(const row of plan.rows){assert(row.counts.reduce((a,b)=>a+b,0)<=plan.cap);if(row.hours>0){assert(row.rate>0);assert.equal(row.notes,Math.ceil(row.hours/2-1e-12));assert(row.notes*2*row.rate>=row.remaining-1e-9);assert((row.notes-1)*2*row.rate<row.remaining+1e-9);}}
const target=plan.rows.find(o=>o.found&&o.unlocked&&o.canLevelUp).index;
box.onmessage({data:{raw:save,action:'notes',config:{goal:'insight',observation:target}}});assert(!response.error,response.error);const focused=response.result.rows.find(o=>o.index===target);assert(focused.counts[1]>0);assert(focused.notes!==null);assert(focused.rate>=plan.focusEstimates[target].rate*(1-1e-9));assert(focused.rate>=plan.rows.find(o=>o.index===target).rate);
// Rebuild the entire account from proposed shapes and lenses to independently verify every ETA.
let raw=typeof save.data.Research==='string'?JSON.parse(save.data.Research):save.data.Research;
raw=N.applyLenses(raw,response.result.assignments);raw[1]=response.result.shapes.owners;response.result.shapes.layout.forEach((p,i)=>{raw[6][4*i]=p.x;raw[6][4*i+1]=p.y;raw[6][4*i+2]=p.angle;});const checkedSave=structuredClone(save);checkedSave.data.Research=raw;const expected=response.result;
box.onmessage({data:{raw:checkedSave}});assert(!response.error,response.error);for(const row of expected.rows){const actual=response.result.observations.find(o=>o.index===row.index);assert(Math.abs(actual.realInsightExpRate-row.rate)<1e-7);const timing=N.timing({...actual,canLevelUp:N.canLevel(response.result,actual)},actual.realInsightExpRate);assert.equal(timing.notes,row.notes);}
assert.equal(JSON.stringify(save),snapshot);
box.onmessage({data:{raw:save,action:'notes',config:{goal:'exp'}}});assert(!response.error,response.error);assert(response.result.after.exp>=response.result.before.exp);
box.onmessage({data:{raw:save,action:'notes',config:{observation:79}}});assert(response.error,'unavailable focus rejected');
console.log('Research Notes: 2-hour rounding, saved progress, zero/locked rates, joint lens and shape plans, focused observations, full-account ETA parity and non-mutation pass.');

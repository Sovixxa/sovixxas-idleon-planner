const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('./research-shapes-model');
const box={console,structuredClone};vm.createContext(box);box.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(file,'utf8'),box));let response;box.postMessage=r=>{if(!r.progress)response=r;};vm.runInContext(fs.readFileSync('research-optimizer-worker.js','utf8'),box);
const save=JSON.parse(fs.readFileSync('../example json.txt','utf8')),snapshot=JSON.stringify(save),raw=typeof save.data.Research==='string'?JSON.parse(save.data.Research):save.data.Research;
box.onmessage({data:{raw:save}});assert(!response.error,response.error);const state=response.result;
box.onmessage({data:{action:'shapes',config:{goal:'exp'}}});assert(!response.error,response.error);const result=response.result;state.shapeRateExtras=result.rateExtras;assert(result.after.exp>result.before.exp);assert(result.steps.length===2*result.shapes.length);assert.equal(JSON.stringify(save),snapshot);
const nodes=state.gridSquares.filter(n=>n.canSelect).map(n=>n.index);
for(const s of result.steps){assert(M.legal(result.shapes[s.id],s.to));assert.equal(s.to.angle,result.saved[s.id].angle,'rotation stays locked');if(s.phase==='park')assert.equal(M.coverage(result.shapes[s.id],s.to,nodes).length,0);}
assert.deepEqual(M.ownersFor(result.layout,result.order,result.shapes,nodes),Array.from(result.owners));
// An overlap belongs to the first shape placed, never the strongest or the last.
const d={id:0,points:[[0,0],[80,0],[80,80],[0,80]],size:[80,80]},p={x:10,y:20,angle:0};assert.equal(M.ownersFor([p,p],[1,0],[d,d],[0])[0],1);
// Independent client polygon routine: test boundaries, concave shapes and rotations.
const attrs={DNSM:{h:{}}},sandbox={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('test-fixtures/research-client-polygon.js','utf8')+';globalThis.clientInside=handler;',sandbox);
for(const shape of result.shapes)for(const angle of [0,5,45,90,185]){const v=M.vertices(shape,{x:40,y:50,angle}),polygon=v.map(p=>p.join(',')).join(';');for(let x=35;x<200;x+=7)for(let y=45;y<190;y+=11)assert.equal(M.inside(x,y,v),!!sandbox.clientInside(`${x},${y}`,polygon));}
// Fast scoring must agree with full parser under arbitrary ownership assignments.
const data=box.WORLD7_CATALOG.Research,defs=M.definitions(data),fast=M.rates(state,raw,defs);
for(let k=0;k<12;k++){const changed=structuredClone(save),r=structuredClone(raw);r[1]=Array.from({length:240},(_,i)=>(i*17+k*3)%11-1);changed.data.Research=r;box.onmessage({data:{raw:changed}});assert(!response.error,response.error);const full=response.result,pred=fast(r[1]),insight=full.observations.filter(o=>o.found&&o.unlocked).reduce((s,o)=>s+o.realInsightExpRate/Math.max(1,o.insightExpREQ),0);assert(Math.abs(pred.exp/full.researchEXPrateTOT-1)<1e-9,JSON.stringify({k,pred:pred.exp,full:full.researchEXPrateTOT,ratio:pred.exp/full.researchEXPrateTOT}));assert(Math.abs(pred.insight-insight)<1e-9);}
box.onmessage({data:{raw:save,action:'shapes',config:{goal:'insight'}}});assert(!response.error,response.error);assert(response.result.after.insight>=response.result.before.insight);assert.equal(JSON.stringify(save),snapshot);
const noShapes=structuredClone(raw);noShapes[1]=Array(240).fill(-1);const empty=M.plan({...state,shapesOwned:0},noShapes,data);assert.equal(empty.steps.length,0);assert.match(empty.reason,/No shapes/);
const rotated=M.plan({...state,canRotateShapes:1},raw,data,{goal:'exp'});assert(rotated.after.exp>=rotated.before.exp);for(const s of rotated.steps)assert.equal(s.to.angle%5,0);
console.log('Shape optimizer: real-save EXP/Insight gains, full-rate parity, legal owned placements, staging, overlap priority, client polygon parity, rotation lock/unlock, no shapes, and non-mutation pass.');

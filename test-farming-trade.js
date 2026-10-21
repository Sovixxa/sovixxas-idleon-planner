'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),M=require('./farming-trade');
for(const n of [776,777,778,778.89])assert(M.qualifies(n));
for(const n of [775.9,778.9,0,777000,NaN,Infinity])assert(!M.qualifies(n));
assert.equal(M.plan(0,1,1).quantity,603729);
assert(M.plan(800**2,1,1).overshot);
assert(M.plan(777**2,1,1).ready);
assert(M.plan(0,1,1000).unreachable);
assert.equal(M.multiplier({}),null);
for(const multi of [1,1.2,30,777,778.9,1e6])for(const unit of [1,1.08,2.5,1000])for(const base of [0,10,10000]){const p=M.plan(base,unit,multi);if(p.quantity!=null){assert(M.qualifies(Math.sqrt(base+p.quantity*unit)*multi));assert(p.quantity>=0);if(!p.ready){assert(M.qualifies(Math.sqrt(base+p.low*unit)*multi));assert(M.qualifies(Math.sqrt(base+p.high*unit)*multi));}}}
const box={console,structuredClone};vm.createContext(box);box.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),box));let response;box.postMessage=x=>response=x;vm.runInContext(fs.readFileSync('farming-extras-worker.js','utf8'),box);const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw);box.onmessage({data:structuredClone(raw)});assert(!response.error,response.error);const f=response.result.farming,multi=M.multiplier(f);assert(multi>0);const catalog={window:{}};vm.runInNewContext(fs.readFileSync('world6-data.js','utf8'),catalog);const model=require('./world6').farm(raw.data||raw,catalog.window.WORLD6_CATALOG);const weighted=model.crops.reduce((s,c)=>s+c.quantity*M.weight(c.id,model.seeds),0);assert(Math.abs(Math.sqrt(weighted)*multi/f.stats.magicBean.totalValue-1)<1e-10);assert(JSON.stringify(raw)===before,'Save must remain unchanged');
const client=fs.readFileSync('../audit/N.js','utf8');assert(client.includes('775.9<m._customBlock_FarmingStuffs("BeanTradeQTY",0,0)&&778.9>m._customBlock_FarmingStuffs("BeanTradeQTY",0,0)&&p._customBlock_Reg_ach_add_status(364,10)'));
console.log('Farming 777: client boundaries, integer targets, overshoot, unreachable crops, account multiplier, missing data and save immutability passed.');

assert.equal(M.beanTarget(0,1,1,100,0).quantity,10000);
assert.equal(M.beanTarget(100,1,1,5,0).quantity,0);
assert.equal(M.beanTarget(0,1,1,100,25).quantity,5625);
assert.equal(M.beanTarget(0,1,1,-1,0),null);
assert.equal(M.beanTarget(0,1,1,Infinity,0),null);

assert(response.result.harvests.length>0);
assert(response.result.harvests.every(p=>Number.isFinite(p.quantity)&&p.quantity>=0));
const harvested=M.harvestRows(response.result,model);
assert(harvested.length>0);
for(let i=1;i<harvested.length;i++)assert(harvested[i-1].gain>=harvested[i].gain);
const sample=harvested[0];
assert(Math.abs(sample.beans-Math.sqrt(weighted+sample.quantity*M.weight(sample.cropId,model.seeds))*multi)<1);
assert(M.beanTarget(100,1,1,20).quantity===300,'Doubling payout needs 3x additional weighted stock');
assert(M.beanTarget(100,1,1,30).quantity===800,'Tripling payout needs 8x additional weighted stock');
console.log('Bean harvest ranking, saved yield and payout breakpoints passed.');

const seeds=[{id:0,start:0,end:10}],crops=[{id:0,found:true},{id:1,found:true},{id:2,found:false}];
const ranked=M.cropPlans(0,1,crops,seeds);
assert.equal(ranked[0].id,0);
assert.equal(ranked[0].beans,777);
assert.equal(ranked.length,2);
assert.deepEqual(M.cropPlans(NaN,1,crops,seeds),[]);
assert.deepEqual(M.cropPlans(800**2,1,crops,seeds),[]);
assert.equal(M.batchPlan(0,1,1,603729).batches,1);
assert(M.batchPlan(0,1,1,700000).unreachable);
assert.equal(M.batchPlan(0,1,1,0),null);
assert.equal(M.batchPlan(0,1,1,1e20),null);
// A fixed second crop can close a gap that either crop alone skips.
assert(M.plan(0,1,777/Math.sqrt(2.08)).unreachable);
assert(M.plan(0,1.08,777/Math.sqrt(2.08)).unreachable);
assert(M.qualifies(M.plan(1.08,1,777/Math.sqrt(2.08)).beans));
console.log('777 crop comparison, mixed crops and whole harvest batches passed.');

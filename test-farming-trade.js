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

const recipe=M.solveMix(0,777/Math.sqrt(2.08),crops,seeds);
assert.equal(recipe.status,'found');
assert.equal(recipe.items.length,2);
assert(M.qualifies(recipe.beans));
assert.equal(M.solveMix(800**2,1,crops,seeds).status,'overshot');
assert.equal(M.solveMix(777**2,1,crops,seeds).status,'ready');
assert.equal(M.solveMix(0,1000,crops,seeds).status,'none');
assert.equal(M.solveMix(0,777/Math.sqrt(2.08),crops,seeds,0).status,'limited');
// Independent exhaustive oracle for small mixtures, including recipes needing 3 crop types.
const mixCrops=[0,5,10].map(id=>({id,found:true}));
let threeCropCase=false;
for(let target=1;target<8;target+=0.017){
 const m=777/Math.sqrt(target);
 let possible=false;
 for(let a=0;a<=8;a++)for(let b=0;b<=6;b++)for(let c=0;c<=4;c++){
  if(M.qualifies(Math.sqrt(a+b*1.08**5+c*1.08**10)*m))possible=true;
 }
 const r=M.solveMix(0,m,mixCrops,seeds);
 assert.equal(r.status==='found',possible,`target ${target}`);
 if(r.status==='found'){
  assert(r.items.every(x=>Number.isSafeInteger(x.quantity)&&x.quantity>0));
  assert(M.qualifies(Math.sqrt(r.items.reduce((sum,x)=>sum+x.quantity*M.weight(x.id,seeds),0))*m));
  if(r.items.length===3)threeCropCase=true;
 }
}
assert(threeCropCase,'Search must find mixtures with more than two crops');
console.log('Automatic recipes match exhaustive mixtures, including three-crop recipes.');

assert.equal(M.testHarvests(0,100,[{id:0,quantity:40}],seeds).status,'none');
const batchMix=M.testHarvests(0,777/Math.sqrt(61.6),[{id:0,quantity:40},{id:1,quantity:20}],seeds);
assert.equal(batchMix.status,'found');
assert.equal(batchMix.harvests.length,2);
assert(batchMix.harvests.every(h=>h.batches===1));
assert(M.qualifies(batchMix.beans));
assert.equal(M.testHarvests(0,777/Math.sqrt(40),[{id:0,quantity:40}],seeds).harvests[0].batches,1);
assert.equal(M.testHarvests(0,777/Math.sqrt(40.5),[{id:0,quantity:40.5}],seeds).status,'found');
for(const quantity of [0,-1,NaN,Infinity,1e20])assert.equal(M.testHarvests(0,100,[{id:0,quantity}],seeds).status,'invalid');
assert.equal(M.testHarvests(0,100,[],seeds).status,'invalid');
assert.equal(M.testHarvests(777**2,1,[{id:0,quantity:40}],seeds).status,'ready');
assert.equal(M.testHarvests(800**2,1,[{id:0,quantity:40}],seeds).status,'overshot');
assert.equal(M.testHarvests(0,777/Math.sqrt(61.6),[{id:0,quantity:40},{id:1,quantity:20}],seeds,0).status,'limited');
console.log('Actual harvest feasibility: 40 apples, mixed batches, fractional yields and bounded conclusions passed.');

assert.equal(response.result.resetScenarios.length,4);
assert(response.result.resetScenarios.every(s=>s.options>0));
const resetBoth=response.result.resetScenarios.find(s=>s.id==='both');
assert(resetBoth.appleYields.length>0);
assert(resetBoth.appleYields[0]<=response.result.resetScenarios.find(s=>s.id==='current').appleYields[0]);
for(const scenario of response.result.resetScenarios)if(scenario.status==='found'){
 assert(M.qualifies(scenario.beans));
 assert(scenario.recipe.every(r=>Number.isSafeInteger(r.batches)&&r.batches>0&&r.quantity>0));
}
console.log('Automatic reset scenarios:',JSON.stringify(response.result.resetScenarios.map(s=>({id:s.id,status:s.status,apples:s.appleYields,recipe:s.recipe}))));

box.scenarioRaw=raw;
const varied=vm.runInContext(`(()=>{const r=scenarioRaw,d=r.data||r,a=PrayerMath.parseData(d,r.charNames,r.companion,r.guildData,r.serverVars||{},r.accountCreateTime,r.tournament).account;const copy=JSON.parse(JSON.stringify(a));copy.farming.stats.magicBean.categories.forEach(c=>c.sources.forEach(s=>s.value=s.name==='More Beenz (Market)'?10:1));return buildResetScenarios(copy);})()`,box);
assert(varied.some(s=>s.status==='found'),'Reset analysis should also find actionable harvest recipes');
for(const s of varied.filter(s=>s.status==='found')){
 const total=s.recipe.reduce((sum,r)=>sum+r.total*M.weight(r.id,model.seeds),s.empty?0:weighted);
 assert(M.qualifies(Math.sqrt(total)*10),'Recommended reset recipe must forward-calculate into range');
}

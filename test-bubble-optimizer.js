const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),B=require('./bubble-optimizer');
const c={window:{}};vm.runInNewContext(fs.readFileSync('alchemy-data.js','utf8'),c);const catalog=c.window.ALCHEMY_CATALOG;
const opts=[];opts[384]='';const raw={CauldronInfo:catalog.map(g=>g.bubbles.map(()=>1)),OptLacc:opts};
const row=(m,id)=>m.rows.find(r=>r.id===id);
assert.equal(B.model({},catalog).rows.every(r=>r.state==='Missing data'),true);
let m=B.model(raw,catalog,{prismaMulti:2});assert.equal(m.rows.length,133);assert(m.todo.length>50);
assert.equal(row(m,'Y23').capLevel,420);assert.equal(row(m,'Y23').target,420);
raw.CauldronInfo[3][23]=420;m=B.model(raw,catalog,{prismaMulti:2});assert.equal(row(m,'Y23').state,'Capped');assert.equal(row(m,'Y23').gain,0);assert(!m.todo.some(r=>r.id==='Y23'));
opts[384]='c23,c28,c32,';m=B.model(raw,catalog,{prismaMulti:4});assert.equal(row(m,'Y23').capLevel,17);assert.equal(row(m,'Y28').state,'Capped');assert.equal(row(m,'Y32').capLevel,null,'20% is an asymptote at 4x, never a finite cap');
assert.equal(row(m,'Y11').state,'Check shared cap');assert(!m.todo.some(r=>r.id==='Y11'));
raw.CauldronInfo[0][0]=50000;m=B.model(raw,catalog,{prismaMulti:2});assert.equal(row(m,'O0').state,'Soft target met');assert(B.value(catalog[0].bubbles[0],50001)>B.value(catalog[0].bubbles[0],50000));
assert.equal(B.value(catalog[0].bubbles[0],200000),75000);
assert.equal(row(m,'Y17').softLevel,247,'95% concerns variable part, not baseline 1');
const missing=B.model({...raw,OptLacc:[]},catalog);assert.equal(row(missing,'Y23').state,'Check multipliers');assert.equal(row(missing,'Y23').capLevel,null);
raw.CauldronInfo[3][23]=null;assert.equal(row(B.model(raw,catalog,{prismaMulti:2}),'Y23').state,'Missing data');raw.CauldronInfo[3][23]=0;assert.equal(row(B.model(raw,catalog,{prismaMulti:2}),'Y23').state,'Locked');
const before=JSON.stringify(raw);B.model(raw,catalog,{prismaMulti:2},{matching:true});assert.equal(JSON.stringify(raw),before);
const plain=B.model(raw,catalog,{prismaMulti:2}),matched=B.model(raw,catalog,{prismaMulti:2},{matching:true});assert.equal(row(plain,'O12').multi,row(matched,'O12').multi,'Carpenter ignores class multiplier');assert(row(matched,'G4').multi>row(plain,'G4').multi);
for(const goal of [.9,.95,.99]){const x=B.model(raw,catalog,{prismaMulti:2},{goal});for(const r of x.todo)assert(r.target>r.level);}
for(const b of catalog.flatMap(g=>g.bubbles).filter(b=>b.name!=='BUBBLE'))for(const level of [1,10,100,50000,50001,100000])assert(B.value(b,level+1)>=B.value(b,level));
console.log('Bubble optimizer: cap boundaries, asymptotes, Prisma, shared pools, missing/locked data, addDECAY, class exemption and purity pass.');

// Compare every supported curve against the actual installed client's expression.
if(fs.existsSync('../audit/N.js')){
 const source=fs.readFileSync('../audit/N.js','utf8'),start=source.indexOf('"addDECAY"==e?'),end=source.indexOf('},x._customBlock_AnvilNumbers',start),expression=source.slice(start,end);
 for(const b of catalog.flatMap(g=>g.bubbles).filter(b=>b.name!=='BUBBLE'))for(const level of [1,60,420,50000,50001,200000]){
  const expected=vm.runInNewContext(expression,{e:b.formula,t:b.base,i:b.scale,n:level});assert(Math.abs(B.value(b,level)-expected)<1e-9,`${b.name} level ${level}`);
 }
 console.log('All bubble curves match the installed game formula at six boundary/sample levels.');
}
const worker={console:{log(){},warn(){},error(){}},structuredClone};worker.self=worker;worker.window=worker;vm.createContext(worker);worker.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),worker,{filename:f}));let result;worker.postMessage=x=>result=structuredClone(x);worker.importScripts('bubble-optimizer-worker.js');
const sample=JSON.parse(fs.readFileSync('../example json.txt','utf8'));worker.onmessage({data:sample});assert(result.prismaMulti>=2&&result.prismaMulti<=4,result.warning);const real=B.model(sample,catalog,result);assert(real.rows.every(r=>r.level===null||Number.isFinite(r.level)));assert(real.todo.every(r=>r.state==='Underleveled'));console.log('Real-save worker: Prisma decoded and cap report generated.');

assert.equal(row(B.model(raw,catalog,{prismaMulti:2,shared:{Y6:100}}),'Y6').state,'Capped');
assert.equal(row(B.model(raw,catalog,{prismaMulti:2,shared:{Y6:100}}),'Y6').gain,0);

assert.equal(row(B.model(raw,catalog,{prismaMulti:2},{goal:.9}),'Y9').softLevel,900);
assert.equal(row(B.model(raw,catalog,{prismaMulti:2}),'Y11').gain,null);
// Spending plans respect the installed 100M threshold, per-click repricing, and separate budgets.
const reqs=[{rawName:'Critter1',name:'Froge',baseCost:10},{rawName:'Liquid2',name:'Liquid2',baseCost:3}];
const spendingContext={spending:{discounts:Array.from({length:4},()=>({all:1,matching:.05})),larry:425,liquids:[1e6,1e6,1e6,1e6],particles:1e9,boron:true,remainingAtomClicks:3}};
const planRow={id:'O10',state:'Underleveled',level:1000,target:1100};
let plan=B.spendingPlan(planRow,reqs,spendingContext,{clicks:25});
assert.equal(plan.method,'Atoms');assert.equal(plan.clicks,3);assert.equal(plan.target,1015);assert.equal(plan.gain,5);
assert.equal(plan.particles,3*Math.floor(11*Math.pow(1.04,10)*100));
assert.equal(plan.totals.Liquid2,159);assert(!('Critter1' in plan.totals));
assert.equal(B.spendingPlan(planRow,reqs,spendingContext,{atomClicks:0}).clicks,0);
assert.equal(B.spendingPlan(planRow,reqs,{spending:{...spendingContext.spending,particles:0}}).clicks,0);
assert.equal(B.spendingPlan(planRow,reqs,{spending:{...spendingContext.spending,liquids:[0,52,0,0]}}).clicks,0);
assert.equal(B.spendingPlan({...planRow,state:'Capped'},reqs,spendingContext).method,'Hold');
assert.equal(B.spendingPlan({...planRow,level:1},reqs,spendingContext).method,'Materials / other');
const candyReq=[{rawName:'Copper',name:'Copper Ore',baseCost:1},reqs[1]];
plan=B.spendingPlan(planRow,candyReq,spendingContext,{clicks:2});assert.equal(plan.method,'Candy / materials');assert.equal(plan.totals.Copper,2e9);assert.equal(plan.particles,0);
assert.equal(B.materialCost({rawName:'W6item8',baseCost:1},27,1000,1),null);
assert.equal(B.materialCost({rawName:'Bits',baseCost:1},20,1000,1),null);
assert.equal(B.materialCost({rawName:'Liquid1',baseCost:2},0,39,1),3);
assert.equal(B.materialCost({rawName:'Liquid1',baseCost:2},0,40,1),4);
assert.equal(B.materialCost(candyReq[0],0,100000,1),1e9);
assert.equal(B.materialCost(candyReq[0],0,1,null),null);
assert.equal(B.candyMaterial('Refinery2'),false);assert.equal(B.candyMaterial('Soul1'),false);assert.equal(B.candyMaterial('OakTree'),true);
assert(real.rows.every(r=>fs.existsSync(r.icon)),'Every bubble has a local picture');
assert(Number.isFinite(result.spending.remainingAtomClicks),'Save supplies remaining atom clicks');
console.log('Bubble spending: atom eligibility, session limits, particles, liquids, candy materials, missing data, special resources and local icons pass.');
// Collection tooltips distinguish usable hard caps from theoretical ceilings.
let summary=B.bonusSummary({effective:42,base:21,ceiling:50,cap:{limit:35},conditional:null}, {bonus:'+{ % chance to keep points.'});
assert.equal(summary.headline,'35% of 35%');assert.equal(summary.ratio,1);assert.equal(summary.effect,'+35 % chance to keep points.');
summary=B.bonusSummary({effective:3,base:1.5,ceiling:4,cap:null}, {bonus:'Gain { x more resources.'});assert.equal(summary.headline,'3× of 4×');assert.equal(summary.label,'theoretical maximum');
summary=B.bonusSummary({effective:50,base:50,ceiling:null,cap:null}, {bonus:'+{ Total STR.'});assert.equal(summary.maximum,null);assert.match(summary.headline,/no fixed maximum/);
summary=B.bonusSummary({effective:null,base:10,ceiling:40,cap:{limit:35}}, {bonus:'+{ % chance.'});assert.match(summary.scope,/Base bonus/);assert.equal(summary.maximum,40);
summary=B.bonusSummary({effective:30,base:30,ceiling:40,cap:{limit:35,shared:true}}, {bonus:'+{ % chance.'});assert.equal(summary.maximum,40);assert.match(summary.note,/shares a cap/);
console.log('Collection bonus summaries: caps, theoretical limits, units, shared pools and missing multipliers pass.');
const cappedTarget=B.bonusLevelTarget({cap:{limit:35},capLevel:420,effective:10,level:100},catalog[3].bubbles[23]);assert.equal(cappedTarget.level,420);assert.match(cappedTarget.text,/320 levels to go/);
for(const threshold of [80,90,95,99]){
 const bubble=catalog[0].bubbles[1],target=B.bonusLevelTarget({cap:null,level:1},bubble,threshold);
 assert(B.value(bubble,target.level)>=3*threshold/100);
 assert(B.value(bubble,target.level-1)<3*threshold/100);
 assert.match(target.text,/No finite level/);
}
assert.equal(B.bonusLevelTarget({cap:{shared:true},shared:null},catalog[3].bubbles[11]).level,null);
assert.equal(B.bonusLevelTarget({cap:null},catalog[0].bubbles[11]).level,null);
assert.equal(B.bonusLevelTarget({cap:{limit:35},effective:null},catalog[3].bubbles[23]).level,null);
console.log('Hover level targets: exact caps, selected checkpoints, unbounded bonuses and missing context pass.');

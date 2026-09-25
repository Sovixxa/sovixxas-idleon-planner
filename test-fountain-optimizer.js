'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('./fountain-optimizer');
const blank=()=>({levels:Array.from({length:3},()=>Array(20).fill(0)),marbles:Array.from({length:3},()=>Array(20).fill(0)),balances:Array(10).fill(0),sediment:[0,0,0],lucky:Array(9).fill(0),ducks:0,desired:-1});
const near=(a,b)=>assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
let s=blank();assert.equal(M.catalog.length,60);assert.equal(M.decode({}),null);
assert(M.unlocked(s,M.catalog[9]));assert(!M.unlocked(s,M.catalog[2]));assert(!M.unlocked(s,M.catalog[30]));
s.levels[0][9]=1;assert(M.unlocked(s,M.catalog[2]));assert(M.unlocked(s,M.catalog[14]));
s.levels[0][2]=9;assert(!M.unlocked(s,M.catalog[12]));s.levels[0][2]=10;assert(M.unlocked(s,M.catalog[12]));
near(M.cost(s,M.catalog[2]),11*1.06**10);
assert.equal(M.cost(s,M.catalog[13],'marble'),1500);assert.equal(M.cost(s,M.catalog[40],'marble'),250000);
s.marbles[0][2]=1;assert.equal(M.bonus(s,0,2),20);assert.equal(M.cost(s,M.catalog[2],'marble'),3000);
s=blank();s.levels[0][2]=10;near(M.incomeFactor(s,0),12);
s.levels[0][12]=1;near(M.incomeFactor(s,0,{active:true})/M.incomeFactor(s,0),5.1);
near(M.incomeFactor(s,0,{overflow:true})/M.incomeFactor(s,0),0.1);
s.levels[0][8]=100;near(M.incomeFactor(s,0,{overflow:true})/M.incomeFactor(s,0),0.35);
s=blank();s.levels[2][2]=10;near(M.incomeFactor(s,6),Math.sqrt(11));
s.levels[1][11]=20;near(M.incomeFactor(s,6),Math.sqrt(22));
s=blank();s.balances[0]=1;let p=M.plan(s,{target:0});assert.equal(p.steps.length,1);assert.equal(p.steps[0].index,9);assert.equal(p.state.balances[0],0);assert.equal(s.levels[0][9],0);
s.balances[1]=1e30;p=M.plan(s,{target:0});assert.equal(p.steps.length,1,'Other currencies cannot pay Bronze costs');
assert.equal(M.plan(s,{target:8}).steps.length,0,'Locked target has no income plan');
s=blank();s.levels.forEach(row=>row.fill(20));s.balances.fill(1e10);
const candidates=M.candidates(s,{target:0});assert(!candidates.some(a=>a.kind==='marble'&&['0_8','0_10','0_11','1_8','1_10'].includes(a.water+'_'+a.index)));
assert(!M.candidates(s,{target:0,active:false}).some(a=>a.water===0&&a.index===12&&a.gain>0),'Away mode must not value Water Bender');
assert(!M.candidates(s,{target:0,overflow:false}).some(a=>a.water===0&&a.index===8&&a.gain>0),'Capacity mode controls retention benefit');
const raw=JSON.parse(fs.readFileSync('../example json.txt')),original=JSON.stringify(raw),decoded=M.decode(raw),snapshot=JSON.stringify(decoded);
assert(decoded);assert.deepEqual(M.decode(raw.data),decoded);
for(let target=0;target<9;target++)for(const active of [true,false]){
 const result=M.plan(decoded,{target,active,steps:50});assert(result.state.balances.every(n=>n>=0));
 const replay=JSON.parse(snapshot);for(const a of result.steps){assert(M.unlocked(replay,a));near(M.cost(replay,a,a.kind),a.cost);assert(replay.balances[a.currency]>=a.cost);replay.balances[a.currency]-=a.cost;replay[a.kind==='marble'?'marbles':'levels'][a.water][a.index]++;assert(a.gain>0);}
 assert.deepEqual(replay,result.state);
}
assert.equal(JSON.stringify(raw),original);assert.equal(JSON.stringify(decoded),snapshot);
for(const u of M.catalog)assert(fs.existsSync(`assets/HoleFountainUpg${u.water}_${u.index}.png`));
console.log('Fountain: formulas, water/prerequisite gates, marble eligibility, separate budgets, active/overflow modes, Green scaling, replay and save immutability pass.');

// Every outside goal operates on its own rounded Fountain multiplier.
s=blank();s.levels.forEach(row=>row.fill(20));s.balances.fill(1e10);
for(const g of M.outsideGoals){
 const before=M.metric(s,{goal:g.id}),edited=JSON.parse(JSON.stringify(s));edited.levels[g.water][g.index]++;
 near(M.metric(edited,{goal:g.id})/before,(100+M.bonus(edited,g.water,g.index))/(100+M.bonus(s,g.water,g.index)));
 const list=M.candidates(s,{goal:g.id}).filter(x=>x.gain>1e-12);
 assert(list.length>0,g.id);assert(list.every(x=>x.water===g.water&&x.index===g.index),g.id+' must not include unrelated upgrades');
}
const balanced=M.plan(s,{goal:'outside',mode:'roadmap',steps:100});assert.equal(balanced.steps.length,100);assert(balanced.effects.length>3);
const lower=M.plan(s,{goal:'measurement',mode:'roadmap',steps:100});assert(lower.effects[0].lower);near(1-lower.effects[0].before/lower.effects[0].after,lower.gain/(1+lower.gain));
for(const active of [false,true]){
 const choices=M.candidates(s,{goal:'marbleIncome',active}).filter(x=>x.gain>1e-12);
 assert(choices.every(x=>(x.water===1&&x.index===10)||(active&&x.water===0&&x.index===12)));
}
s.ignored='0cdab_efh';assert.deepEqual(M.activeCurrencies(s),[7]);
assert.equal(M.plan(s,{target:6}).steps.length,0,'Ignored currency must not show income advice');
near(M.metric(s,{goal:'income',target:'all'}),M.incomeFactor(s,7));
s.ignored='0abcdefgh';assert.deepEqual(M.activeCurrencies(s),[0],'Game falls back to Bronze when all are ignored');
s=blank();s.balances.fill(0);s.levels.forEach(row=>row.fill(20));
assert.equal(M.plan(s,{goal:'damage',mode:'now'}).steps.length,0);
const long=M.plan(s,{goal:'damage',mode:'roadmap',steps:500});assert.equal(long.steps.length,500);assert(long.steps.every(a=>a.future));assert(long.funding.some(x=>x>0));
near(long.funding.reduce((a,b)=>a+b,0),long.spent.reduce((a,b)=>a+b,0));
for(const goal of ['income','outside','damage','measurement','marbleIncome']){
 const opts={goal,target:'all',mode:'roadmap',steps:250,active:true};
 const result=M.plan(decoded,opts),replay=JSON.parse(snapshot),funding=Array(10).fill(0);
 let future=false;
 for(const a of result.steps){
  assert(M.unlocked(replay,a));near(M.cost(replay,a,a.kind),a.cost);
  const before=M.metric(replay,opts);const extra=Math.max(0,a.cost-replay.balances[a.currency]);near(extra,a.shortfall);
  funding[a.currency]+=extra;replay.balances[a.currency]+=extra;if(extra>0)future=true;assert.equal(a.future,future);
  replay.balances[a.currency]=Math.max(0,replay.balances[a.currency]-a.cost);replay[a.kind==='marble'?'marbles':'levels'][a.water][a.index]++;
  near(a.gain,M.metric(replay,opts)/before-1);
 }
 assert.deepEqual(replay,result.state);assert.deepEqual(funding,result.funding);
 result.spent.forEach((spent,c)=>near(decoded.balances[c]+result.funding[c],spent+result.state.balances[c]));
 assert(result.state.balances.every(Number.isFinite));assert(result.funding.every(Number.isFinite));
}
assert.equal(JSON.stringify(decoded),snapshot);
console.log('Fountain goals and roadmap: 18 outside targets, balanced scoring, Minau reduction, marble speed, ignored currencies, 500 purchases, funding replay and immutable imports pass.');

const row=(from,extra={})=>({water:0,index:2,kind:'level',currency:0,from,cost:10*(from+1),gain:.1,shortfall:0,future:false,effects:[{label:'Example',before:100*1.1**from,after:100*1.1**(from+1),gain:.1}],...extra});
const sequence=[row(0),row(1),row(2,{future:true,shortfall:30}),row(3,{future:true,shortfall:40})],unchanged=JSON.stringify(sequence);
const grouped=M.recommendationRows(sequence,{compress:true});assert.equal(grouped.length,2);assert.equal(grouped[0].from,0);assert.equal(grouped[0].to,2);assert.equal(grouped[0].cost,30);near(grouped[0].gain,.21);near(grouped[0].effects[0].gain,.21);assert.equal(grouped[1].shortfall,70);assert.equal(grouped[1].startOrder,3);assert.equal(grouped[1].endOrder,4);
assert.equal(M.recommendationRows(sequence).length,4);
assert.equal(M.recommendationRows([row(0),row(1),row(2)],{compress:true,completed:['0:2:level:2']}).length,2,'Do not bridge completed levels');
assert.equal(M.recommendationRows([row(0),row(0,{index:3,currency:1}),row(1)],{compress:true,payment:'0'}).length,2,'Do not reorder across filtered purchases');
assert.equal(M.recommendationRows([row(0),row(1,{kind:'marble'})],{compress:true}).length,2,'Keep marble and normal purchases separate');
assert.equal(JSON.stringify(sequence),unchanged);
console.log('Fountain compression: level ranges, costs, compounded gains, funding boundaries, filtered/completed gaps and immutable rows pass.');

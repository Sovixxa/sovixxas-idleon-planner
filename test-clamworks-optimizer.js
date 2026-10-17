'use strict';
const assert=require('node:assert/strict'),M=require('./clamworks-optimizer');
const fresh=()=>({pearls:1e8,levels:Array(9).fill(0),promotion:0,unlocked:0});
assert.equal(M.decode({}),null);const o=Array(466).fill(0);o[454]=123;o[455]=5;o[464]=2;o[465]=4;assert.equal(M.decode({data:{OptLacc:JSON.stringify(o)}}).levels[0],5);
let s=fresh();assert.equal(M.cost(s,0),1);assert.equal(M.cost(s,1),4);assert.equal(M.requirement(s,8),2e8);s.promotion=2;assert.equal(M.requirement(s,3),5120);s.levels[4]=10;s.levels[8]=5;assert.equal(M.cost(s,0),1/(2.2*1.8));
s=fresh();s.levels[5]=1;assert.equal(M.production(s),1.5);s.levels[5]=2;assert.equal(M.production(s),1.75);s=fresh();s.levels[3]=10;assert.equal(M.production(s,{multikill:1000}),1.1);s.levels[1]=23;assert.equal(M.buy(s,1,true),null);
s=fresh();s.pearls=4;assert.equal(M.buy(s,1,false),null);const bought=M.buy(s,1,true);assert.equal(bought.shortfall,16);assert.equal(s.pearls,16);assert.equal(s.unlocked,1);
for(const mode of ['now','roadmap'])for(const population of [true,false]){s=fresh();s.pearls=500;const before=JSON.stringify(s),opts={mode,population,multikill:1000,steps:40},p=M.plan(s,opts),replay=JSON.parse(before);assert.equal(JSON.stringify(s),before);assert(p.steps.length>0);for(const step of p.steps){assert.deepEqual(M.buy(replay,step.id,mode==='roadmap'),step);assert(replay.pearls>=0);}assert.deepEqual(replay,p.state);assert(p.gain>0);if(mode==='now')assert.equal(p.funding,0);if(!population)assert(!p.steps.some(x=>x.id===1));}
console.log('Clamworks: exact costs, promotion unlocks, discounts, pure pearls, multikill, cap, budget and replay passed.');
const farmer={loot:{damage:25e16,base:100,perTier:[0,0,0,0,0,0,50]}};
assert.equal(M.farmerMultikill(farmer,0),175);
assert.equal(M.farmerMultikill({...farmer,loot:{...farmer.loot,damage:25e16-32}},0),127);
assert.equal(M.farmerMultikill(farmer,1),127);
assert.equal(M.farmerMultikill({...farmer,missing:['PVStatList_']},0),null);
assert.equal(M.farmerMultikill({loot:{base:100}},0),null);
console.log('Automatic multikill: W7 diminishing returns, tier boundary, promotion HP and missing data passed.');
const alternating=[{id:0,name:'A',from:0,to:1,cost:10,shortfall:0,balance:50},{id:1,name:'B',from:0,to:1,cost:20,shortfall:0,balance:30},{id:0,name:'A',from:1,to:2,cost:40,shortfall:10,balance:0}];
const grouped=M.purchaseRows(alternating,[],true);assert.equal(grouped.length,2);assert.equal(grouped[0].cost,50);assert.equal(grouped[0].shortfall,10);assert.deepEqual(grouped[0].orders,[1,3]);assert.deepEqual(grouped[0].keys,['0:1','0:2']);assert.equal(M.purchaseRows(alternating,grouped[0].keys,true).length,1);assert.equal(M.purchaseRows(alternating,[],false).length,3);assert.equal(M.purchaseRows(alternating,['0:1'],true)[1].count,1);
console.log('Compression: alternating upgrades, mixed funding, totals, group completion and uncompressed order passed.');

const mena=Array.from({length:6},()=>Array(10).fill(0));mena[0][8]=30;mena[0][7]=75;mena[2][4]=1;mena[5]=[1,2,0,2,1,3,1,0,1];const scSave=M.decode({data:JSON.stringify({OptLacc:JSON.stringify(o),Menagerie:JSON.stringify(mena)})});assert.equal(scSave.scurgeKnown,true);assert.equal(scSave.scurgeUnlocked,true);const summary=M.scurgeSummary(scSave);assert.equal(summary.pearls,19);assert.equal(summary.pearlMulti,8);assert.equal(summary.discount,1.5);assert.equal(summary.expMulti,5);assert.equal(summary.exp,75);const plain={...scSave,scurge:Array(9).fill(0)};assert(Math.abs(M.cost(plain,0)/M.cost(scSave,0)-1.95)<1e-9);assert.equal(M.production(scSave)/M.production(plain),8);assert.equal(M.decode({OptLacc:o}).scurgeKnown,false);console.log('Scurge: wrapped saves, green pearls, income and per-slot discounts passed.');

'use strict';
const assert=require('node:assert/strict'),m=require('./breeding-exp');
assert.equal(m.exp(1,4,2),(2+8*1.85)*2);
const save=m.fromSave({data:{Breeding:JSON.stringify([[1,0],[2,3],[0,0,2,0,0,5,0,0,0,0,0,10]]),GemItemsPurchased:JSON.stringify(Array.from({length:120},(_,i)=>i===119?2:0)),Tasks:JSON.stringify([[],[],[[],[],[],[0,0,1]]])}});
assert.equal(save.pets,5);assert.equal(save.capacity,8);assert.equal(save.rarity,5);assert.equal(m.fromSave({}).loaded,false);
const o={capacity:10,rarity:10,pets:60,multi:1,shatter:0,mode:'item'};
assert.equal(m.simulate(o,1,1000).hatches,1000);
const a=m.simulate(o,4,20000),b=m.simulate({...o,multi:5},4,20000);
assert.equal(a.hatches,b.hatches);assert(Math.abs(b.perEgg/a.perEgg-5)<1e-10);
assert.equal(m.simulate({...o,rarity:0},2).locked,true);
const refunds=m.simulate({...o,shatter:10},1,150000);
const chance=Math.ceil(12*10**.698)/100;
assert(Math.abs(refunds.hatches/150000-(1+chance)/(1-chance))<.06);
assert.equal(m.optimize({...o,rarity:0},1000).best.target,1);
console.log('Breeding EXP: formula, imports, locked rarities, multiplier invariance and Shattershell expected return passed.');

assert.equal(m.fromSave({Breeding:[[],[17,17,18,16,1,0,0,0]],OptLacc:Array.from({length:118},(_,i)=>i===117?4:0)}).pets,68,'Unreleased world placeholder is not a discovered pet');
assert.equal(m.fromSave({Breeding:[[],[17,17,18,1,0,0,0,0]]}).pets,52,'Only the three available worlds count before W4 pet breeding unlocks');

// Firebase exports split Tasks into TaskZZ0, TaskZZ1, TaskZZ2, etc.
const capacityFixture=JSON.parse(require('node:fs').readFileSync('../example json.txt','utf8'));
assert.equal(m.fromSave(capacityFixture).capacity,15,'3 base + 5 upgrade + 5 gem shop + 2 merit');
const splitTask=[[],[],[],[0,0,2]];
for(const exported of [splitTask,JSON.stringify(splitTask)]){
 assert.equal(m.fromSave({Breeding:[[0],[1],[0,0,5]],GemItemsPurchased:Array.from({length:120},(_,i)=>i===119?5:0),TaskZZ2:exported}).capacity,15);
}
assert.equal(m.fromSave({Tasks:[[],[],splitTask],TaskZZ2:[[],[],[],[0,0,9]]}).capacity,5,'Canonical Tasks takes precedence');

// Independent expectations: one Normal hatch per item without refunds; with
// refund probability p, expected hatches/item is (1+p)/(1-p).
assert.equal(m.eggEstimate(m.simulate(o,1,20000)),1);
assert(Math.abs(m.eggEstimate(refunds)-(1-chance)/(1+chance))<.01);
assert.equal(m.eggEstimate(a),m.eggEstimate(b),'EXP multipliers cannot change item cost');
for(const row of [{locked:true},{steps:150000,hatches:0},{steps:150000,hatches:99}])assert.equal(m.eggEstimate(row),null);
// At capacity 1, guaranteed Copper upgrades take fill + upgrade = 2 items.
assert.equal(m.eggEstimate(m.simulate({...o,capacity:1,mode:'natural',legend:1e6},2,20000)),2);
console.log('Egg estimate audit: independent item-cost expectations, refund chains, low samples and EXP independence passed.');

const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={};box.window=box;vm.createContext(box);
vm.runInContext(fs.readFileSync('royal-armory-data.js','utf8'),box);
global.ROYAL_ARMORY_CATALOG=box.ROYAL_ARMORY_CATALOG;
global.RoyalArmory=require('./royal-armory');
const {snapshot,optimize}=require('./masterclass-model');
const stored=Array.from({length:100},(_,i)=>1000+i);
const model=snapshot('royalArmory',{RoyalG:[[],stored,Array(83).fill(0),[]]});
const catalog=global.ROYAL_ARMORY_CATALOG;
assert(model.upgrades.length>60);
for(const row of model.upgrades){
 const expected=catalog.upgrades.find(x=>x.index===row.slot).costResourceIndex;
 assert.equal(row.currency,expected,`${row.name}: shelf ${row.slot}`);
 assert.equal(model.balances[row.currency],1000+expected);
 assert(fs.existsSync(`assets/RGres${expected}.png`));
}
// These are deliberately different from their upgrade-ID currencies.
for(const [id,currency] of [[58,0],[70,1],[71,2]]){
 const row=model.upgrades.find(x=>x.id===id);
 assert.equal(row.currency,currency);
 assert.notEqual(row.currency,catalog.upgrades.find(x=>x.index===id).costResourceIndex);
}
const militia=model.upgrades.find(x=>x.id===58);
assert.equal(militia.cost,3);
const plan=optimize({balances:{0:3},upgrades:[{...militia,unlocked:true}]});
assert.equal(plan.steps.length,1);
assert.equal(plan.steps[0].currency,0);
console.log(`Royal Armory resources: ${model.upgrades.length} shelf currencies, balances, assets and purchase budget verified`);

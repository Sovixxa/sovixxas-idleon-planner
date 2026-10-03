const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('./engine');
const state=E.parseInput(fs.readFileSync('../example json.txt','utf8')),arr=E.arrangementFromBoard(state),before=JSON.stringify(state);
for(const goal of ['damage','bloodcells'])for(const reserve of [0,50,75]){
 const p=E.planUpgradePurchases(state,arr,{goal,reserve,count:100});assert(p.spent<=p.budget);assert.equal(p.shortfall,0);
 const projected=E.cloneState(state);let total=0;
 for(const s of p.steps){assert.equal(s.cost,E.upgradeCost(projected,s.orderIndex));assert.equal(s.level,projected.upgrades[s.id]);projected.upgrades[s.id]++;total+=s.cost;assert.equal(s.spent,total);}
 const future=E.planUpgradePurchases({...state,bloodcells:0},arr,{goal,mode:'future',count:25});assert(future.steps.length>0);assert.equal(future.shortfall,future.spent);
 assert.equal(E.planUpgradePurchases({...state,bloodcells:0},arr,{goal}).steps.length,0);
}
assert.equal(JSON.stringify(state),before);console.log('Jelly purchase budgets, sequential prices, future funding and save preservation pass.');

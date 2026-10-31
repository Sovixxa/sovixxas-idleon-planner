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

for(const goal of ['killEta','overall']){
 const p=E.planUpgradePurchases(state,arr,{goal,mode:'future',count:3});
 assert(p.steps.length>0,goal+' produces purchases');
 assert.equal(p.goal,goal);
 assert(p.steps.every(s=>s.score>0&&Number.isFinite(s.score)));
 const replay=E.cloneState(state);
 for(const step of p.steps){assert.equal(step.cost,E.upgradeCost(replay,step.orderIndex));replay.upgrades[step.id]++;}
 const empty=E.planUpgradePurchases({...state,bloodcells:0},arr,{goal,count:1});
 assert.equal(empty.steps.length,0);
 if(goal==='killEta'){assert(p.initialCombat);assert(p.finalCombat);assert(p.steps.every(s=>s.killRatio>1));}
 else assert(p.steps.every(s=>s.overallRatio>1));
}
assert.equal(JSON.stringify(state),before);
console.log('Kill ETA and Overall goals: positive gains, sequential costs, zero budgets and save preservation pass.');

// Every step must obey the game purchase frontier, research gate and finite caps.
function legalReplay(s,board,options){
 const p=E.planUpgradePurchases(s,board,options),r=E.cloneState(s);
 for(const step of p.steps){
  const m=E.UPGRADE_META[step.id],oi=step.orderIndex;
  assert(r.researchLevel>=E.upgradeLevelReq(oi));
  assert(oi===0||r.upgrades[E.UPGRADE_ORDER[oi-1]]>=1);
  assert(m.max>998||(r.upgrades[step.id]||0)<m.max);
  assert.equal(step.cost,E.upgradeCost(r,oi));
  assert.equal(step.level,r.upgrades[step.id]||0);
  r.upgrades[step.id]=(r.upgrades[step.id]||0)+1;
 }
 return p;
}
for(const goal of ['damage','bloodcells','killEta','overall']){
 const fresh=E.makeState(Array.from({length:19},()=>[]),15);
 const free=legalReplay(fresh,[],{goal,count:10});
 assert.deepEqual(free.steps.map(s=>s.id),[0]);assert.equal(free.spent,0);
 for(const level of [0,14,17,19,21,23,50,100]){
  fresh.researchLevel=level;
  legalReplay(fresh,[],{goal,mode:'future',count:10});
  if(level<15)assert.equal(E.planUpgradePurchases(fresh,[],{goal}).steps.length,0);
 }
}
const frontier=E.cloneState(state);frontier.researchLevel=100;frontier.upgrades.fill(0);frontier.upgrades[0]=1;
const chain=legalReplay(frontier,arr,{goal:'damage',mode:'future',count:8});
assert(chain.steps.some(s=>s.id===39&&s.prerequisiteFor),'Operational Bonuses bridges the damage unlock chain');
assert(chain.steps.some(s=>s.id===18),'damage chain reaches Cell Destruction');
const capped=E.cloneState(state);capped.researchLevel=100;capped.upgrades.fill(1);capped.upgrades[18]=9999;
assert(E.upgradeCandidates(capped,arr,{skipSimulation:true}).some(s=>s.id===18),'9999 is an uncapped marker');
capped.upgrades[17]=20;
assert(!E.upgradeCandidates(capped,arr,{skipSimulation:true}).some(s=>s.id===17),'finite cap respected');
const partial=E.cloneState(state);partial.rawData=null;partial.rawRoot=null;
assert(E.planUpgradePurchases(partial,arr,{goal:'bloodcells',mode:'future',count:3}).steps.length>0,'relative currency gains do not require external multipliers');
console.log('Unlock frontier, research boundaries, free starter, prerequisite chains, caps and partial exports pass.');

// Force expiration between candidates and ensure incomplete comparisons are discarded.
let progressCount=0;
const bounded=E.planUpgradePurchases(state,arr,{goal:'killEta',mode:'future',count:1000,timeMs:1,onProgress:()=>progressCount++});
assert(bounded.timeLimited);assert.equal(bounded.steps.length,0);assert(progressCount>0);
assert.equal(bounded.spent,0);assert.equal(bounded.requestedCount,1000);
console.log('Upgrade time budget, partial-plan metadata and progress callback pass.');

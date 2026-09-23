'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={console,structuredClone};vm.createContext(c);
for(const f of ['prayer-math-engine.js','game-currency.js','shadow-caps-data.js','stat-todo-model.js','drop-rate-model.js','combat-stat-model.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw);
for(const kind of ['drop','damage','classExp']){
 const result=kind==='drop'?c.DropRateModel.calculate(raw):c.CombatStatModel.calculate(raw,kind);
 assert(result.todo.tasks.length>0);assert.equal(result.todo.characters.length,raw.charNames.length);
 assert(result.todo.capNotes.length>0);
 for(const t of result.todo.tasks){assert(result.todo.groups.some(g=>g.id===t.recommendation.group));assert(t.recommendation.why);}
 assert.equal(new Set(result.todo.tasks.map(t=>t.id)).size,result.todo.tasks.length);
 for(const task of result.todo.tasks){assert(task.bonus?.text);if(task.bonus.available){assert(Number.isFinite(task.bonus.delta));assert.equal(task.bonus.delta,task.bonus.to-task.bonus.from);}assert(task.steps.length&&task.target&&task.location&&task.gate);const app=fs.readFileSync('app.js','utf8');assert(app.includes(task.page+':')||app.includes('SKILL_PAGES.'+task.page+'='),task.page);}
 if(kind==='drop')assert(!result.todo.tasks.some(t=>t.title.includes('Card Stamp')));
}
assert.equal(JSON.stringify(raw),before);
const parsed={account:{stamps:{combat:[{rawName:'StampA38',displayName:'Golden_Sixes',effect:'Drop_Rate',level:5,maxLevel:5,hasMaterials:false,hasMoney:true,enoughPlayerStorage:false}]},upgradeVault:{upgrades:[]}},characters:[]};
let plan=c.StatTodoModel.build(parsed,'drop',{});assert.equal(plan.tasks.length,0);assert(plan.unknown.includes('Stamp levels'));
plan=c.StatTodoModel.build(parsed,'drop',{StampLv:[],StampLvM:[]});assert.equal(plan.tasks[0].section,'Resource upgrades');assert(plan.tasks[0].target.includes('limit'));assert(plan.tasks[0].gate.includes('Carry capacity is short'));
parsed.account.upgradeVault.upgrades[18]={name:'Drops',level:60,maxLevel:60,unlocked:true};
plan=c.StatTodoModel.build(parsed,'drop',{UpgVault:[]});assert.equal(plan.tasks.length,0);assert(plan.covered.includes('Drops'));
parsed.account.upgradeVault.upgrades[18]={name:'Drops',level:0,maxLevel:60,unlocked:false,unlockLevel:100};parsed.account.upgradeVault.totalUpgradeLevels=50;
plan=c.StatTodoModel.build(parsed,'drop',{UpgVault:[]});assert.equal(plan.tasks[0].section,'Unlocks');assert(plan.tasks[0].reason.includes('50'));
for(const f of ['drop-rate-worker.js','combat-stat-worker.js'])assert(fs.readFileSync(f,'utf8').includes('stat-todo-model.js'));
for(const f of ['drop-rate.js','combat-stat-tabs.js'])assert(fs.readFileSync(f,'utf8').includes('StatTodo.mount'));
console.log('Stat To-do: account plans, destinations, immutable saves, absent-data gates, capped exclusions and blocked stamp/Vault steps pass.');
const milestone=c.StatTodoModel.bubbleMilestone;
assert.equal(milestone({level:100,func:'decay',x1:40,x2:70}).target,630);
assert.equal(milestone({level:630,func:'decay',x1:40,x2:70}).target,1330);
assert.equal(milestone({level:1330,func:'decay',x1:40,x2:70}).target,6930);
assert(milestone({level:7974,func:'decay',x1:40,x2:70}).maintenance);
assert.equal(milestone({level:10217,func:'addDECAY',x1:4,x2:0}).target,15000);
assert(milestone({level:50000,func:'addDECAY',x1:4,x2:0}).maintenance);
assert.equal(milestone({level:78595,func:'bigBase',x1:9.7,x2:.3}).target,83000);
const cardAccount={account:{accountOptions:[],spelunking:{loreBosses:[{},{},{defeated:true}]}},characters:[{playerId:0,name:'Test',cards:{equippedCards:{test:{rawName:'test',displayName:'Test',effect:'Total_Drop_Rate',amount:100,stars:5}}}}]};
const cardData={Cards0:{test:100},CardEquip_0:[],Rift:[45]};
assert.equal(c.StatTodoModel.build(cardAccount,'drop',cardData).tasks.filter(t=>t.id==='card:test').length,1);
cardAccount.account.accountOptions[603]='test';
assert.equal(c.StatTodoModel.build(cardAccount,'drop',cardData).tasks.filter(t=>t.id==='card:test').length,0);
cardAccount.account.accountOptions[603]='';cardAccount.characters[0].cards.equippedCards.test.stars=6;
assert.equal(c.StatTodoModel.build(cardAccount,'drop',cardData).tasks.filter(t=>t.id==='card:test').length,0);
cardAccount.characters[0].cards.equippedCards.test.stars=4;cardData.Rift=[0];cardAccount.account.spelunking.loreBosses[2].defeated=false;
assert.equal(c.StatTodoModel.build(cardAccount,'drop',cardData).tasks.filter(t=>t.id==='card:test').length,0);
console.log('To-do regression: Cardifier exclusions, unlocked star ceilings, decay milestones, damage breakpoint and Grind Time batch target pass.');
const bonusAccount={account:{arcade:{shop:[]},alchemy:{bubbles:{yellow:[{rawName:'grind',bubbleName:'GRIND_TIME',level:100,func:'bigBase',x1:9.7,x2:.3}]}}},characters:[]};
bonusAccount.account.arcade.shop[12]={effect:'+{% Class EXP',level:100,func:'add',x1:2,x2:0};
const bonusPlan=c.StatTodoModel.build(bonusAccount,'classExp',{ArcadeUpg:[],CauldronInfo:[]});
const arcadeBonus=bonusPlan.tasks.find(t=>t.id==='arcade:12').bonus;
assert.equal(arcadeBonus.from,200);assert.equal(arcadeBonus.to,404);assert.equal(arcadeBonus.delta,204);
const bubbleBonus=bonusPlan.tasks.find(t=>t.id==='bubble:grind').bonus;
assert.equal(bubbleBonus.from,39.7);assert.equal(bubbleBonus.to,69.7);
assert.equal(c.StatTodoModel.build(parsed,'drop',{UpgVault:[]}).tasks[0].bonus.available,false);
console.log('Bonus previews: finite source deltas, milestone targets, Arcade doubling and unlock-only exclusions pass.');
const priorityAccount={account:{currencies:{rawMoney:10000},stamps:{combat:[
 {rawName:'cheap',displayName:'Cheap',effect:'Drop_Rate',level:5,maxLevel:10,hasMoney:true,goldCost:10},
 {rawName:'blocked',displayName:'Blocked',effect:'Drop_Rate',level:5,maxLevel:5,hasMoney:true,hasMaterials:false,enoughPlayerStorage:true,goldCost:1},
 {rawName:'saturated',displayName:'Saturated',effect:'Drop_Rate',level:190,maxLevel:200,hasMoney:true,goldCost:1,func:'decay',x1:20,x2:10}
 ]},upgradeVault:{upgrades:[]},arcade:{shop:[]},alchemy:{bubbles:{yellow:[{rawName:'nearCap',bubbleName:'DROPPIN_LOADS',level:990,func:'decay',x1:40,x2:10}]},vials:[{name:'undiscovered',stat:'7drMulto',level:0,func:'add',x1:1,x2:0}] }},characters:[]};
priorityAccount.account.upgradeVault.upgrades[18]={name:'Costly',level:1,maxLevel:60,unlocked:true,cost:9000,x5:1};
priorityAccount.account.arcade.shop[27]={level:100,effect:'Drop_Rate',func:'add',x1:1,x2:0};
const priorityData={StampLv:[],StampLvM:[],UpgVault:[],ArcadeUpg:[],CauldronInfo:[]};
let priorities=c.StatTodoModel.build(priorityAccount,'drop',priorityData);
const rec=id=>priorities.tasks.find(t=>t.id===id).recommendation;
assert.equal(priorities.tasks[0].id,'stamp:cheap');
assert.equal(rec('stamp:blocked').group,'resources');assert.equal(rec('stamp:saturated').group,'low');
assert.equal(rec('bubble:nearCap').group,'low');assert.equal(rec('arcade:27').group,'time');
assert.equal(rec('vial:undiscovered').group,'time');assert(rec('vault:18').why.includes('over 10%'));
assert(rec('arcade:27').order<rec('vial:undiscovered').order);
priorities=c.StatTodoModel.build(priorityAccount,'drop',{StampLv:[]});assert.equal(rec('stamp:cheap').group,'resources');
priorityAccount.account.currencies.rawMoney=null;
priorities=c.StatTodoModel.build(priorityAccount,'drop',{UpgVault:[]});assert.equal(rec('vault:18').group,'resources');
console.log('Priorities: affordability, missing balances/limits, cap saturation, milestone urgency and limited attempts pass.');
// Exercise renderer event handlers through a small host double. All selectors
// used by this component are data attributes; preserve live details state.
const host={html:'',elements:[],set innerHTML(html){
 this.html=html;this.elements=[];
 for(const tag of html.matchAll(/<(?:details|select|input|button)\b[^>]*>/g)){
  const attrs={},dataset={};for(const m of tag[0].matchAll(/([\w-]+)(?:="([^"]*)")?/g)){attrs[m[1]]=m[2]??'';if(m[1].startsWith('data-'))dataset[m[1].slice(5).replace(/-([a-z])/g,(_,v)=>v.toUpperCase())]=m[2]??'';}
  this.elements.push({attrs,dataset,open:Object.hasOwn(attrs,'open'),checked:Object.hasOwn(attrs,'checked')});
 }
},get innerHTML(){return this.html;},querySelectorAll(selector){return this.elements.filter(e=>Object.hasOwn(e.attrs,selector.slice(1,-1)));},querySelector(selector){return this.querySelectorAll(selector)[0];}};
vm.runInContext(fs.readFileSync('stat-todo.js','utf8'),c);
const renderPlan=c.StatTodoModel.build(priorityAccount,'drop',priorityData);
c.StatTodo.mount(host,'drop',renderPlan);
assert(host.html.includes('assets/Coins1.png'));assert(!host.html.includes('[[nextCoinCost]]'));
const group=id=>host.querySelectorAll('[data-todo-group]').find(d=>d.dataset.todoGroup===id);
assert(group('easy').open);assert(group('time').open);assert(!group('low').open);
assert.equal((host.html.match(/<details\b/g)||[]).length,(host.html.match(/<\/details>/g)||[]).length);
host.querySelector('[data-todo-collapse]').onclick();assert(!group('easy').open&&!group('time').open);
const task=host.querySelectorAll('[data-todo-task]')[0];task.open=true;
const check=host.querySelectorAll('[data-todo-done]')[0];check.checked=true;check.onchange();
assert(!group('easy').open);assert(host.querySelectorAll('[data-todo-task]')[0].open);assert(host.html.includes('1 checked this visit'));
host.querySelector('[data-todo-section]').onchange({target:{value:'low'}});
assert(group('low'));assert(!group('easy'));
host.querySelector('[data-todo-section]').onchange({target:{value:'all'}});assert(!group('easy').open);
host.querySelector('[data-todo-expand]').onclick();assert(group('easy').open&&group('low').open);
host.querySelector('[data-todo-search]').onchange({target:{value:'no-matching-upgrade'}});assert(host.html.includes('No tasks match'));
console.log('To-do UI: nested groups, default collapse, bulk controls, filtering and checkbox/open-state preservation pass.');
const currency=require('./game-currency');
assert.deepEqual(currency.coins('123456'),[{tier:3,amount:'12'},{tier:2,amount:'34'},{tier:1,amount:'56'}]);
assert.deepEqual(currency.coins(1e24),[{tier:13,amount:'1'}]);
assert.deepEqual(currency.coins('123456789012345678901234'),currency.coins('1.23456789012345678901234e23'));
assert.deepEqual(currency.coins(99.99),[{tier:1,amount:'99'}]);
assert.deepEqual(currency.coins(0),[{tier:1,amount:'0'}]);
assert.deepEqual(currency.coins('1e-3'),[{tier:1,amount:'0'}]);
for(const value of [null,undefined,'',NaN,Infinity,-1,'<script>'])assert.equal(currency.coins(value),null);
const coinHtml=currency.html('4611042935328405600000000000000000000000000000000000000');
assert((coinHtml.match(/<img /g)||[]).length<=3);assert(coinHtml.includes('Coins25.png'));assert(coinHtml.includes('≈'));
assert(!coinHtml.includes('4,611,042,935'));assert(currency.html(null).includes('Unknown'));
assert(currency.richText('<img src=x> [[nextCoinCost]]',{nextCoinCost:100}).includes('&lt;img src=x&gt;'));
assert(currency.richText('Price [[nextCoinCost]]',{nextCoinCost:'<script>'}).includes('Unknown coin cost'));
for(const kind of ['drop','classExp','damage']){
 const p=c.StatTodoModel.build(priorityAccount,kind,priorityData);c.StatTodo.mount(host,kind,p);
 assert(!host.html.includes('[[nextCoinCost]]'));
 for(const t of p.tasks.filter(t=>t.id.startsWith('stamp:')||t.id.startsWith('vault:')))assert(Object.hasOwn(t.money,'nextCoinCost'));
}
console.log('Currency: base-100 tiers, scientific notation, exact strings, fractional/unknown values, compact icons and escaped To-do rendering pass.');

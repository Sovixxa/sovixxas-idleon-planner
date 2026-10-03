'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),review=require('./account-review');
const c={window:{}};
for(const f of ['stamps-data.js','alchemy-data.js','construction-data.js','world4-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),c);
const catalogs=c.window;
const section=(m,id)=>m.sections.find(s=>s.id===id);
let m=review.model({},catalogs);
assert.equal(m.known,0);assert.equal(m.ranked.length,0);
const raw={data:{StampLv:JSON.stringify([[0,9,null,'oops',-1,100]]),CauldronInfo:[[11]],Meals:[[4]],Lv0_0:'[29]',Tower:[0,1],Rift:[4],TotemInfo:[JSON.stringify([9])]}};
const before=JSON.stringify(raw);m=review.model(raw,catalogs);
const stamps=section(m,'stamps').rows;
assert.equal(stamps[0].status,'unstarted');assert.equal(stamps[1].target,10);
for(const i of [2,3,4])assert.equal(stamps[i].status,'unknown');
assert.equal(stamps[5].status,'complete');assert.equal(section(m,'characters').next.target,30);
assert.equal(section(m,'worship').next.current,9);assert.equal(section(m,'cooking').next.target,5);
assert.equal(section(m,'rift').next.target,5);assert.equal(section(m,'construction').rows[1].status,'complete');
assert.equal(section(m,'alchemy').next.target,25);assert(!section(m,'alchemy').rows.some(r=>r.name==='BUBBLE'));
assert(m.stampTargets.some(item=>item.system==='Stamps'&&item.name===stamps[0].name));
assert(m.stampTargets.some(item=>item.system==='Stamps'&&item.sourceUrl));
assert(review.model({CauldronInfo:[[0]]},catalogs).unlocks.some(item=>item.system==='Alchemy bubbles'));
assert.equal(JSON.stringify(raw),before,'Review must not mutate save');
const changed=review.model({StampLv:[[0,10]]},catalogs);assert.equal(section(changed,'stamps').rows[1].target,25);
assert.equal(section(review.model({StampLv:[[false,'',Infinity]]},catalogs),'stamps').known,0);
const sample=review.model(JSON.parse(fs.readFileSync('../example json.txt','utf8')),catalogs);
assert.equal(sample.sections.filter(s=>s.known).length,7);
for(const s of sample.sections)for(const r of s.rows){assert(r.progress>=0&&r.progress<=1);if(r.status==='next')assert(r.target>r.current);}
// Render escaping and filter wiring without retaining private fixture data.
const elements=new Map();const host={innerHTML:'',querySelector(s){if(!elements.has(s))elements.set(s,{});return elements.get(s);},querySelectorAll(){return[];}};
const ui={...catalogs,document:{},console};ui.window=ui;vm.createContext(ui);vm.runInContext(fs.readFileSync('account-review.js','utf8'),ui);
ui.STAMP_CATALOG=[{stamps:[{id:'A1',name:'<script>bad</script>',bonus:'<img onerror=bad>'}]}];
ui.AccountReview.render(host,{StampLv:[[0]],ChestOrder:['StampA1'],ChestQuantity:[1]});assert(host.innerHTML.includes('&lt;script&gt;'));assert(!host.innerHTML.includes('<script>'));
assert(host.innerHTML.includes('My Plan'));assert(host.innerHTML.includes('Add to plan'));assert(!host.innerHTML.includes('check its coin, material and carry-capacity requirements'));
assert(host.innerHTML.includes('What are you working toward?'));assert(host.innerHTML.includes('Account checks'));assert(host.innerHTML.includes('data-review-goal'));

ui.AccountReview.render(host,{});assert(host.innerHTML.includes('Start with your account'));
console.log('Account Review: partial exports, boundaries, fresh saves, seven-system fixture, placeholder exclusion, escaping and filters OK');

// Account priorities must reflect actionable opportunities, not generic counters.
const decoded=new Map([
  ['construction',{buildings:[{index:0,name:'3D Printer',level:1,finishedUpgrade:true}]}],
  ['stamps',[[{level:10,canUpgradeWithCoins:true,canUpgradeWithMats:true,cantCarry:false}]]],
  ['breeding',{eggsUnclaimed:2}],
  ['lab',{bonuses:[{unlocked:true,active:false}]}],
  ['storage',{storageChestsUsed:{a:true}}]
]);
const actionable=review.model(raw,{...catalogs,BeanValueEngine:{systems:()=>decoded}});
assert.deepEqual(actionable.priorities.map(x=>x.page),['construction','breeding']);assert(actionable.priorities[0].name.includes('3D Printer'));
assert(actionable.priorities.every(x=>x.state==='Do now'&&x.facts.length));
assert(!actionable.priorities.some(x=>x.sectionId==='storageReview'));
assert(!actionable.priorities.some(x=>x.page==='lab'),'Generic Lab checks are not recommendations');
assert(actionable.priorities.every(x=>x.reason&&x.blocker));
assert.equal(new Set(actionable.priorities.map(x=>x.id)).size,actionable.priorities.length);
assert.equal(review.model({},catalogs).priorities.length,0);
const growthCatalog={STAMP_CATALOG:[{stamps:[{name:'Combat',bonus:'Base damage'},{name:'Production',bonus:'Skill efficiency'}]}]};
assert.equal(review.model({StampLv:[[9,9]]},growthCatalog).priorities.length,0,'Levels alone do not justify a purchase');
assert.equal(review.model({StampLv:[[0,null]]},growthCatalog).priorities.length,0);
assert.deepEqual(review.model(raw,catalogs).priorities,review.model(raw,catalogs).priorities);
ui.AccountReview.render(host,{StampLv:[[0]],ChestOrder:['StampA1'],ChestQuantity:[1]});
assert(host.innerHTML.includes('Your next account steps'));
assert(host.innerHTML.includes('Hand in'));
assert(host.innerHTML.includes('data-review-priority'));
console.log('Account priorities: readiness, growth weighting, diversity, uncertainty, deterministic order and placement OK');

assert.equal(review.model({StampLv:[[100]]},growthCatalog).priorities.length,0,'No arbitrary next-level fallback');

// Goal ranking must change recommendations, preserve input, and avoid unrelated effects.
const goalCatalog={STAMP_CATALOG:[{stamps:[{name:'Damage',bonus:'Total damage'},{name:'Sampling',bonus:'Skill efficiency'},{name:'Chef',bonus:'Cooking speed'},{name:'Pets',bonus:'Pet damage'},{name:'Loot',bonus:'Drop rate'}]}],ALCHEMY_CATALOG:[{bubbles:[{name:'Fighter',bonus:'Total damage'},{name:'Miner',bonus:'Mining efficiency'}]}]};
const evidence={actions:goalCatalog.STAMP_CATALOG[0].stamps.map((s,i)=>({id:'priced|'+i,name:s.name,effect:s.bonus,page:'stamps',score:100-i,state:'Prepare first',reason:'Known shortfall',blocker:'Saved price',facts:[{label:'Cost',text:'100'}]}))};
const goalReport=review.model({StampLv:[[9,9,9,9,9]],CauldronInfo:[[10,10]]},goalCatalog,evidence),goalBefore=JSON.stringify(goalReport);
const damage=review.rankForGoal(goalReport,'damage');
assert(damage.actions.some(x=>x.name==='Damage'));assert(!damage.actions.some(x=>x.id==='bubble-goal|damage'),'No generic goal shortcut');
assert(!damage.actions.some(x=>['Pets','Sampling','Chef'].includes(x.name)));
assert.equal(review.rankForGoal(goalReport,'cooking').actions[0].name,'Chef');
assert.equal(review.rankForGoal(goalReport,'samples').actions[0].name,'Sampling');assert(!review.rankForGoal(goalReport,'samples').actions.some(x=>x.id==='bubble-goal|samples'));
assert.equal(review.rankForGoal(goalReport,'drop').actions[0].name,'Loot');
assert.equal(review.rankForGoal(goalReport,'damage',{readyOnly:true}).actions.length,0);
assert.equal(review.rankForGoal(goalReport,'invalid').goal.id,'balanced');
assert.equal(JSON.stringify(goalReport),goalBefore);
assert.equal(review.rankForGoal(review.model({},goalCatalog),'damage').actions.length,0);
assert(review.rankForGoal(actionable,'damage').claims.some(x=>x.page==='construction'));
assert(review.rankForGoal(actionable,'balanced',{readyOnly:true}).actions.every(x=>x.state==='Do now'));
assert(review.rankForGoal(goalReport,'damage').actions.every(x=>x.goalReason&&x.blocker));
console.log('Goal ranking: relevance, bubble routing, readiness separation, unknown goals, missing data and purity pass.');


// Missing stamp levels alone must never become acquisition recommendations.
const missingNames=['Splosion Stamp','Shiny Crab Stamp','Gear Stamp','SpoOoky Stamp','Prayday Stamp','Arcade Ball Stamp','Gold Ball Stamp','Talent I Stamp','Talent V Stamp'];
const missingSave={StampLv:catalogs.STAMP_CATALOG.map(group=>group.stamps.map(stamp=>missingNames.includes(stamp.name)?0:1))};
const missingReview=review.model(missingSave,catalogs);
assert.equal(missingReview.stampTargets.length,9);
assert.equal(missingReview.stampTargets.filter(item=>item.status==='unavailable').length,7);
assert.equal(missingReview.stampTargets.filter(item=>item.status==='random').length,2);
assert(!missingReview.unlocks.some(item=>missingNames.includes(item.name)));
assert(!missingReview.priorities.some(item=>missingNames.includes(item.name)));
assert(!review.rankForGoal(missingReview,'unlock').actions.some(item=>missingNames.includes(item.name)));
const stamp={id:'C4',name:'Arcade Ball Stamp'};
assert.equal(review.stampAcquisition(stamp,{ChestOrder:['StampC4'],ChestQuantity:[0]}).status,'random');
assert.equal(review.stampAcquisition(stamp,{ChestOrder:['StampC4']}).status,'random');
assert.equal(review.stampAcquisition(stamp,{ChestOrder:'["StampC4"]',ChestQuantity:'[1]'}).status,'ready');
assert(review.stampAcquisition(stamp,{InventoryOrder_10:['StampC4'],ItemQTY_10:[1]},{charNames:Array.from({length:11},(_,i)=>'Hero '+i)}).detail.includes('Hero 10'));
const quest={name:'Pig Quest',npc:'Pig',states:{0:0},rewards:['1 × StampA4']};
assert.equal(review.stampAcquisition({id:'A4'},{},{},[quest]).status,'quest');
assert.equal(review.stampAcquisition({id:'A4'},{},{},[{...quest,states:{0:-1}}]).status,'unverified');
assert.equal(review.stampAcquisition({id:'A4'},{},{},[{...quest,states:{0:1}}]).status,'unverified');
assert.equal(review.stampAcquisition({id:'A4'},{},{},[{...quest,name:'Holiday gift'}]).status,'unverified');
assert.equal(review.stampAcquisition({id:'A39'},{}).status,'unverified','Do not reuse obsolete Stat Wallstreet unavailable flag');
assert(review.model({...missingSave,ChestOrder:['StampC4'],ChestQuantity:[1]},catalogs).unlocks.some(item=>item.name==='Arcade Ball Stamp'&&item.status==='ready'));
const ownedRare=review.model({StampLv:[[],[],[null,null,null,1]]},catalogs);
assert(ownedRare.sections.find(s=>s.id==='stamps').rows.some(item=>item.name==='Arcade Ball Stamp'&&item.current===1),'Owned stamps remain in review coverage');
console.log('Stamp acquisition: all nine reported stamps excluded; rare rewards, actual item possession, quest access and owned upgrades pass.');

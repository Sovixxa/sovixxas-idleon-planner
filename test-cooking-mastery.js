'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),M=require('./cooking-mastery');
assert.equal(M.multi(0),1);assert.equal(M.multi(5),1.5);assert.equal(M.multi(45),1.9);assert(M.relative(11)>=1&&M.relative(12)<1);assert(M.relative(45)>=.1&&M.relative(46)<.1);
const c={console:{log(){},warn(){},error(){}},structuredClone};c.self=c;vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c));let result;c.postMessage=r=>result=r;c.importScripts('cooking-worker.js');const raw=JSON.parse(fs.readFileSync('../example json.txt'));c.onmessage({data:raw});assert(!result.error,result.error);const s=result.scenarios.find(s=>s.id==='secondary'),m=s.mastery,rate=s.values[1];assert(m.unlocked);assert.equal(m.level,24);assert.equal(m.nodes[64].points,37);
const research=typeof raw.data.Research==='string'?JSON.parse(raw.data.Research):raw.data.Research;
assert.equal(m.points.nodeLeft,Math.max(0,Math.round(m.points.base+m.points.gridBonus+(research[7][9]>5?1:0)-m.points.nodeSpent)));
assert.equal(m.points.categoryLeft,Math.max(0,Math.round(m.points.base+(research[7][9]>13?1:0)-m.points.categorySpent)));
const near=(a,b)=>assert(Math.abs(a-b)/Math.max(1,Math.abs(b))<1e-10,`${a} != ${b}`);near(M.speedAt(m,rate,{}),rate.speed);
const yellow=M.yellowRows(m,rate);assert(yellow[0].gain>0);assert(yellow.find(n=>n.id===64).gain<1e-10,'Golden food is not direct kitchen speed');
const purple=M.purpleRows(m);assert(!purple.find(c=>c.index===4).unlocked);assert(!purple.find(c=>c.index===5).unlocked);
for(const row of purple.filter(c=>c.isExpBoost&&c.slope>0)){assert(100*row.slope/(1+row.slope*row.soft)<1);assert(100*row.slope/(1+row.slope*row.shadow)<.1);}
for(const color of ['yellow','purple']){const plan=M.allocate(m,rate,color);assert(plan.count<=(color==='yellow'?m.points.nodeLeft:m.points.categoryLeft));if(color==='yellow')assert(M.speedAt(m,rate,plan.points)>=rate.speed);else assert(!plan.changes.some(x=>[3,4,5].includes(x.id)));}
// Independent full kitchen recalculation verifies the fast yellow scoring, including pooled meal effects.
const parsed=c.PrayerMath.parseData(structuredClone(raw.data),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const read=v=>typeof v==='string'?JSON.parse(v):v,account=parsed.account;
const initial=c.PrayerMath.parseKitchens(read(raw.data.Cooking),read(raw.data.Atoms),parsed.characters,account,{characterIndex:1}).reduce((s,k)=>s+k.mealSpeed,0);
for(const id of [1,12,13,43,55]){const meal=account.cooking.meals[id];if(!['Mcook','KitchenEff','zMealFarm'].includes(meal.stat))continue;const old=meal.cookingMasteryNode.multi;meal.cookingMasteryNode.multi=M.multi(meal.cookingMasteryNode.level+1);const changed=c.PrayerMath.parseKitchens(read(raw.data.Cooking),read(raw.data.Atoms),parsed.characters,account,{characterIndex:1}).reduce((s,k)=>s+k.mealSpeed,0);meal.cookingMasteryNode.multi=old;const current=result.scenarios[0];near(M.speedAt(current.mastery,current.values[1],{[id]:1})/current.values[1].speed,changed/initial);}
console.log('Mastery: formula thresholds, Jelly points, locked flavors, point allocations, and yellow gains versus full kitchen formula pass.');console.log('Best yellow:',yellow[0].name,yellow[0].gain,'Purple:',purple.find(r=>r.unlocked&&r.isExpBoost)?.name,'Points',m.points);
const snapshot=JSON.stringify(m),setup=M.accountSetup(m,38);
assert.equal(Object.values(setup).reduce((a,b)=>a+b,0),38);assert(setup[64]>0,'Balanced setup must consider Yumi');
const excluded=M.accountSetup(m,38,{64:0});assert.equal(excluded[64],0);assert(Object.values(M.accountSetup(m,0)).every(v=>v===0));
const live=M.preview(m,rate,{13:5},{1:10});assert(live.speed>rate.speed);assert(live.expRate>m.expRate);
assert.equal(JSON.stringify(m),snapshot);assert(M.bonusAt(m.nodes[64],0)<m.nodes[64].bonus);
const altered={...m,points:{...m.points,categoryLeft:1}},withInitial=M.allocate(altered,rate,'purple','speed',{1:50});assert(withInitial.points[1]>=50,'Remaining-point plan must preserve simulated allocation');
console.log('Mastery calculator: budget, priorities, Yumi allocation, live bonus previews, preserved inputs and save immutability pass.');
// Yumi-first policy targets the knee of the curve without exhausting the budget.
assert.equal(M.accountSetup(m,38)[64],10);
assert.equal(Object.values(M.accountSetup(m,38)).reduce((s,n)=>s+n,0),38);
assert(M.accountSetup(m,10)[64]<=8);
assert.equal(M.accountSetup(m,38,{},45)[64],30);
assert.equal(M.accountSetup(m,38,{64:0})[64],0);
const savedGain=M.gainSummary(m,{}).find(g=>g.stat==='zGoldFood');near(savedGain.gain,100*(M.multi(37)-1));
const testGain=M.gainSummary(m,{64:20}).find(g=>g.stat==='zGoldFood');near(testGain.gain,80);
console.log('Yumi target, reserved budget, exclusion and setup-gain summaries pass.');
const accountPlan=M.accountSetup(m,38),cookingPlan=M.accountSetup(m,38,{},20,'cooking');
assert.equal(accountPlan[64],10);assert.equal(Object.values(accountPlan).reduce((s,n)=>s+n,0),38);
for(const node of m.nodes.filter(n=>M.cookingOnly.has(n.stat)))assert.equal(accountPlan[node.id],0,`${node.name} should be excluded from account plan`);
assert(m.nodes.some(n=>M.cookingOnly.has(n.stat)&&cookingPlan[n.id]>0));
assert.equal(M.defaultWeight({stat:'Mcook'}),0);assert.equal(M.defaultWeight({stat:'Seff'}),2);assert.equal(M.defaultWeight({stat:'zGoldFood'}),1);
console.log('Account profile excludes all cooking-only bonuses; cooking profile remains available.');
assert.equal(M.defaultWeight({stat:'ResearchXP'}),1);
assert.equal(M.defaultWeight({stat:'zJade'}),3);
assert.equal(M.defaultWeight({stat:'Sailing'}),0);
assert.equal(M.defaultWeight({stat:'TPpete'}),0);
for(const budget of [38,100,300]){
 const setup=M.accountSetup(m,budget);
 assert.equal(setup[51],0,'Sailing excluded');assert.equal(setup[45],0,'Buncha Banana excluded');assert(setup[58]<=1,'Essence has one-point recommendation limit');
 assert(setup[72]>=setup[60],'Research receives at least as much as jade in sample');
}
console.log('Account priorities: Research above jade, sailing/Banana excluded, essence capped at one point.');

// A new or situational stat must never silently consume overall-account points.
const allowed=new Set(['zGoldFood','ResearchXP','MineCurr','Seff','zJade']);
assert.equal(M.defaultWeight({stat:'futureUnreviewedBonus'}),0);
for(const budget of [1,10,38,100,300,2000]){
 const plan=M.accountSetup(m,budget);
 for(const node of m.nodes)if(!allowed.has(node.stat))assert.equal(plan[node.id],0,`${node.name} leaked into overall at ${budget}`);
 assert.equal(Object.values(plan).reduce((a,b)=>a+b,0),budget);
}
const future={...m,nodes:[...m.nodes,{id:999,name:'Future',mealLevel:1,points:0,bonus:100,stat:'MineCurr'}]};
assert(M.accountSetup(future,38)[999]>0,'Unlocked Minehead competes at P1');
future.nodes[future.nodes.length-1].mealLevel=0;
assert.equal(M.accountSetup(future,38)[999],0,'Locked Minehead cannot consume points');
assert(M.accountSetup(m,100,{34:1})[34]>0,'Manual opt-in remains available');
assert(M.accountSetup(m,300,{58:1})[58]<=1,'Opt-in essence stays capped');
console.log('Overall shortlist, unknown-stat exclusion, locked Minehead, manual opt-in and 2,000-point budget pass.');
console.log('Overall 38-point plan:',m.nodes.filter(n=>accountPlan[n.id]>0).map(n=>`${n.name}: ${accountPlan[n.id]}`).join(', '));

// Compare golden-food projection against independently reparsing an edited export.
const active=result.scenarios.find(s=>s.id==='current');
const editedRaw=structuredClone(raw),cookMaster=JSON.parse(editedRaw.data.CookMaster);
cookMaster[0][64]+=1;editedRaw.data.CookMaster=JSON.stringify(cookMaster);
const edited=c.PrayerMath.parseData(structuredClone(editedRaw.data),editedRaw.charNames,editedRaw.companion,editedRaw.guildData,editedRaw.serverVars||{},editedRaw.accountCreateTime,editedRaw.tournament);
for(const r of active.values){
 const impact=M.pointImpact(active.mastery,r,{64:38},64);
 const exact=c.PrayerMath.getGoldenFoodMulti(edited.characters[r.id],edited.account,edited.characters).value;
 near(impact.test,(exact-1)*100);near(impact.saved,(r.goldenFood.multiplier-1)*100);
 const unchanged=M.pointImpact(active.mastery,r,{},64);near(unchanged.relative,0);near(unchanged.next,impact.test);
 assert(impact.relative>0&&impact.relative<M.relative(37),'Account gain must account for other golden food sources');
}
const sampleImpact=M.pointImpact(active.mastery,active.values[1],{64:38},64);
console.log('Golden food projection matches full edited-save recalculation for every character:',JSON.stringify(sampleImpact));
const pooled=M.pointImpact(m,rate,{6:1,27:2},41);
near(pooled.test,m.nodes.filter(n=>n.stat==='Seff').reduce((sum,n)=>sum+M.bonusAt(n,({6:1,27:2})[n.id]??n.points),0));
assert.equal(pooled.kind,'meal');assert(M.pointImpact(m,rate,{},13).nextRelative>0);

// Currency/hour must match a fully reparsed account, preserving the shared grid/meal bracket.
for(const points of [0,1,4,9,20]){
 const copy=structuredClone(raw),cm=JSON.parse(copy.data.CookMaster);cm[0][73]=points;copy.data.CookMaster=JSON.stringify(cm);
 const parsedMine=c.PrayerMath.parseData(structuredClone(copy.data),copy.charNames,copy.companion,copy.guildData,copy.serverVars||{},copy.accountCreateTime,copy.tournament);
 const impact=M.pointImpact(active.mastery,active.values[1],{73:points},73);
 assert.equal(impact.kind,'currency');near(impact.test,parsedMine.account.minehead.currencyGain);
 if(points===4)console.log('Minehead 4 points:',JSON.stringify(impact));
}
const noMine={...m,minehead:undefined};assert.equal(M.pointImpact(noMine,rate,{},73).kind,'meal');
const lockedMine={...m,minehead:{...m.minehead,perHour:0}};assert.equal(M.pointImpact(lockedMine,rate,{73:4},73).test,0);
console.log('Minehead actual currency/hour: edited-save parity, absent-data fallback and locked income pass.');

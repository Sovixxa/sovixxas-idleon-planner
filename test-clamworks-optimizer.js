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
for(const population of [false,true]){
 const state=fresh();state.pearls=50;const before=JSON.stringify(state),opts={population,multikill:1000,steps:20,rate:100};const p=M.promotionPlan(state,opts);
 assert.equal(JSON.stringify(state),before);assert(p.time<=p.baseline);assert.equal(p.hours,p.time/100);assert(p.steps.length<=20);
 let elapsed=0;const replay=JSON.parse(before),initial=M.production(replay,opts);
 for(const step of p.steps){const speed=M.production(replay,opts)/initial;const a=M.buy(replay,step.id,true);elapsed+=a.shortfall/speed;assert.equal(step.elapsed,elapsed);assert.equal(a.cost,step.cost);}
 elapsed+=Math.max(0,p.target-replay.pearls)/(M.production(replay,opts)/initial);assert(Math.abs(elapsed-p.time)<1e-8);assert.deepEqual(replay,p.state);
 assert(!p.steps.some(a=>a.id===1&&!population));
}
const ready=M.promotionPlan(fresh(),{rate:100});assert.equal(ready.time,0);assert.equal(ready.save,0);assert.equal(ready.steps.length,0);
assert.equal(M.promotionPlan({...fresh(),pearls:0}).hours,null);
const one={...fresh(),pearls:0};const single=M.promotionPlan(one,{steps:1});let exact=1e5;
for(let id=0;id<9;id++){if(id===1||id===3)continue;const s=JSON.parse(JSON.stringify(one)),a=M.buy(s,id,true);if(a)exact=Math.min(exact,a.shortfall+Math.max(0,1e5-s.pearls)/M.production(s));}
assert.equal(single.time,exact);
console.log('Promotion route: no mutation, timed replay, saving baseline, ready balance, missing rate and exhaustive one-step comparison passed.');
// Scurge route replay and client parity.
const fs=require('fs'),vm=require('vm'),{handler}=require('./client-source-utils');
const catalogBox={window:{}};vm.runInNewContext(fs.readFileSync('world7-data.js','utf8'),catalogBox);
const attrs={Menagerie:Array.from({length:6},()=>Array(10).fill(0)),OtherPlayers:{h:{}},DNSM:{h:{}}};
const q={},env={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},D:{mapCount:o=>Object.keys(o.h).length},q,m:{_customBlock_Thingies:(key,id)=>key==='Clam_Cost'?1:catalogBox.window.WORLD7_CATALOG.Spelunky[28][9+id]*attrs.Menagerie[5][id]}};
q._customBlock_MenagerieStuff=vm.runInNewContext('('+handler(fs.readFileSync('../audit/N.js','utf8'),'_customBlock_MenagerieStuff')+')',env);
for(const players of [0,1,10])for(const value of [0,1,20]){attrs.Menagerie[5]=Array(9).fill(value);attrs.OtherPlayers.h=Object.fromEntries(Array.from({length:players+1},(_,i)=>[i,{}]));assert.equal(M.scurgeGain(attrs.Menagerie[5],players),q._customBlock_MenagerieStuff('ScurgeEXPgain',0,0));}
assert.equal(M.scurgePlan(fresh()).unavailable,true);
const scInput={...fresh(),scurgeKnown:true,scurgeUnlocked:true,scurgeLevel:0,scurgeExp:0,scurge:Array(9).fill(0)},scBefore=JSON.stringify(scInput);
const route=M.scurgePlan(scInput,{steps:60,kills:1000});assert.equal(JSON.stringify(scInput),scBefore);assert.equal(route.steps.length,60);assert.equal(route.steps[0].waitKills,50);assert.equal(route.hours,route.totalKills/1000);assert(!route.steps.some(x=>x.id===2||x.id===7));
let lv=0,xp=0,total=0,green=0,sl=Array(9).fill(0);
for(const a of route.steps){if(green===0){const req=(50+15*lv)*1.08**lv,count=Math.ceil(Math.max(0,req-xp)/M.scurgeGain(sl));assert.equal(count,a.waitKills);xp=Math.max(0,xp+count*M.scurgeGain(sl)-req);total+=count;lv++;green++;}assert(lv>=M.scurgeUnlocks[a.id]);sl[a.id]++;green--;assert.equal(a.totalKills,total);}
assert.deepEqual(sl,route.levels);assert.equal(M.scurgePlan(scInput,{mode:'now'}).steps.length,0);
const advanced={...scInput,scurgeLevel:500};const spend=M.scurgePlan(advanced,{mode:'now',players:5,affliction:2,steps:100});assert(spend.steps.some(a=>a.id===7));assert(spend.levels[2]<=2);assert(spend.levels[2]>0);assert.equal(spend.totalKills,0);assert.equal(spend.pearls,400);
console.log('Scurgeworks: client EXP parity, immutable inputs, unlocks, funding replay, population, affliction cap and available budget passed.');

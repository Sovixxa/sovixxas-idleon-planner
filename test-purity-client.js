'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{handler}=require('./client-source-utils');
const box={console,structuredClone};box.self=box;box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync('dashboard-math.js','utf8'),box);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),parse=x=>typeof x==='string'?JSON.parse(x):x,d=parse(raw.data),g=parse(d.RoyalG),maps=parse(d.RoyalMaps),research=parse(d.Research);
const p=box.DashboardMath.parseData({...d,OptLacc:d.OptLacc||d.OptionsListAccount},raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
let model=box.DashboardMath.getPurityRankContext(d,p.account,p.characters);
const source=fs.readFileSync(process.env.PURITY_CLIENT_SOURCE || '../audit/purity-live-N-nov01.js','utf8');
const native=handler(source,'_customBlock_RoyalG'),dns={h:{}},rewardTable=vm.runInNewContext('('+handler(source,'Research')+')()');
const customLists={h:{Research:rewardTable,ArmoryUpg:vm.runInNewContext('('+handler(source,'ArmoryUpg')+')()'),MapDetails:vm.runInNewContext('('+handler(source,'MapDetails')+')()')}};
for(const name of ['SpelunkUpg','OrbletMarket','SpelunkRocks'])customLists.h[name]=vm.runInNewContext('('+handler(source,name)+')()');
const spelunk=parse(d.Spelunk);
const env={Math,k:{_customBlock_getLOG:v=>Math.log(Math.max(1,v))/2.30259},h:{string:String},c:{asNumber:v=>v==null?0:Number(v)},l:function(){this.h={};},a:{engine:{getGameAttribute:key=>({RoyalG:g,RoyalMaps:maps,Spelunk:spelunk,Research:research,GetPlayersUsernames:raw.charNames,PlayerDATABASE:{h:Object.fromEntries(raw.charNames.map((name,i)=>[name,{h:{Lv0:parse(d['Lv0_'+i])}}]))},DNSM:dns,CustomLists:customLists,CustomMaps:{h:{NonAFKscreens:{h:{}}}}})[key]}},q:{_customBlock_JellyOperation:(_,id)=>Number(research[7][9])>id?Number(rewardTable[47][id]):0},m:{}};
const call=vm.runInNewContext('('+native+')',env);
for(const name of ['_customBlock_Thingies','_customBlock_Spelunk'])env.m[name]=vm.runInNewContext('('+handler(source,name)+')',env);
env.q._customBlock_JellyOperation=vm.runInNewContext('('+handler(source,'_customBlock_JellyOperation')+')',env);
env.m._customBlock_RoyalG=call;
assert.equal(customLists.h.SpelunkUpg.length,68);
assert.equal(customLists.h.ArmoryUpg[77][0],'State-Wide_Propoganda');
assert.equal(env.m._customBlock_Spelunk('ShopUpgBonus',77,0),undefined);
const originalLevel=g[2][77],originalTarget=g[3][7];
for(const target of [0,1,2,3,4]){
 g[3][7]=target;g[2][77]=0;const baseline=call('BarExpRate_Base',target,0);
 for(const level of [1,50,100]){g[2][77]=level;assert.equal(call('ArmoryUpgBonus',77,0),10*level);assert.equal(call('BarExpRate_Base',target,0),baseline);}
}
g[2][77]=originalLevel;g[3][7]=originalTarget;
console.log('Selected native client: Armory 77 levels 1/50/100 never activate its multiplier across all five selected ranks; runtime reads missing Spelunking slot 77.');
for(const o of model.outposts)for(const b of o.rankBars){
 assert.equal(b.rank,call('OutpostEXPrank',o.mapIndex,b.type));
 assert.equal(b.required,call('OutpostEXPreq',o.mapIndex,b.type));
 const expected=call('BarExpRate',b.type,o.mapIndex);
 assert(Math.abs(b.expPerUnit-expected)<1e-8*Math.max(1,expected),`${o.name} ${b.name}: ${b.expPerUnit} vs ${expected}`);
 assert(Math.abs(b.expPerHour-(expected*b.units+b.militiaExpPerHour))<1e-8*Math.max(1,b.expPerHour));
}

// Exercise unlocked Priests, later ranks, purification and Glorification even in early saves.
g[2][26]=100;g[2][75]=1;g[2][72]=10;
g[6]=[7,7];g[7]=[1,1];
for(const xp of [0,100001]){
 maps[1][7]=xp;maps[1][12]=1;
 model=box.DashboardMath.getPurityRankContext({...d,RoyalG:g,RoyalMaps:maps},p.account,p.characters);
 const outpost=model.outposts.find(x=>x.mapIndex===1),bar=outpost.rankBars[4];
 assert(bar.unlocked);assert.equal(bar.units,2);assert(bar.expPerHour>0);
 const expected=call('BarExpRate',4,1);
 assert(Math.abs(bar.expPerUnit-expected)<1e-8*expected);
 assert.equal(bar.factors.find(x=>x.name==='Map purified').value,xp?3:1);
 assert(bar.factors.find(x=>x.name==='Spelunking Purity Hardhat').value>1);
}
console.log('Selected native client parity: all rank types across the saved outposts, plus assigned Priests, Purity rank 1, Hardhat, Jelly and Glorification scenarios passed.');

for(const entry of maps)if(Array.isArray(entry)&&entry.length>=3)entry[10]=0;
for(const links of [0,1,2]){
 maps[0][10]=1;maps[0][8]=links>=1?1001:-1;maps[0][9]=links>=2?1001:-1;
 delete dns.h.RG_suppo;
 model=box.DashboardMath.getPurityRankContext({...d,RoyalG:g,RoyalMaps:maps},p.account,p.characters);
 const o=model.outposts.find(x=>x.mapIndex===1),b=o.rankBars[4];
 assert.equal(call('TotalSupports',1,0),links);assert.equal(o.supports,links);
 const expected=call('BarExpRate',4,1);
 assert(Math.abs(b.expPerUnit-expected)<1e-8*expected);
 assert.equal(b.factors.find(x=>x.name==='Support Camps (including Jelly)').value,1+links*b.supportBonus/100);
}
console.log('Native Support Camp counting and rates passed for zero, one and duplicate two-link scenarios.');

const collect=vm.runInNewContext('('+handler(source,'_customEvent_CollectAll')+')',env);
for(let scenario=0;scenario<32;scenario++){
 const hours=[0,1/60,1,24,100,1000,0.5,7][scenario%8];
 for(let i=0;i<maps.length;i++)maps[i]=[];
 maps[1]=[5,0,12,0,14.99,179,0,99000,-1,-1,0,'555555555',1];
 maps[2]=[0,0,0,0,0,0,0,0,1001,1001,1,'',0];
 for(let w=0;w<8;w++){g[6+2*w]=[];g[7+2*w]=[];}
 g[6]=scenario%2?[7,4,5,7]:[5,7,4,7];g[7]=[1,1,1,1];g[2][17]=scenario%3?1:0;g[3][0]=hours*3600;
 g[2][43]=scenario;maps[1][12]=scenario%2;maps[2][9]=scenario%3?1001:-1;
 if(scenario>=16){for(let type=3;type<=7;type++)maps[1][type]=String(maps[1][type]);}
 for(const key of Object.keys(dns.h))delete dns.h[key];
 const input={...d,RoyalG:g,RoyalMaps:maps},before=JSON.stringify(input);
 const forecast=box.DashboardMath.getPurityForecast(input,p.account,p.characters);
 assert.equal(JSON.stringify(input),before,'forecast must not change save');
 model=forecast.initial;
 collect.call({});
 for(const outpost of forecast.projected.outposts){
  for(const bar of outpost.rankBars){
   const expected=Number(maps[outpost.mapIndex][3+bar.type]);
   assert(Math.abs(bar.exp-expected)<1e-8*Math.max(1,expected),`CollectAll ${hours}h ${outpost.name} ${bar.name}: ${bar.exp} vs ${expected}`);
  }
 }
 assert.equal(g[3][0],0);
}
console.log('Full native CollectAll parity: 32 cases spanning banked time, numeric/string EXP, unit ordering, rank boundaries, supports, Glorification, militia and save immutability passed.');

// Stronk Rank: native handlers and initial/projected forecast parity.
for(const level of [0,10,15,50]){
 g[23][6]=level;
 for(const key of Object.keys(dns.h))delete dns.h[key];
 const forecast=box.DashboardMath.getPurityForecast({...d,RoyalG:g,RoyalMaps:maps},p.account,p.characters);
 assert.equal(env.m._customBlock_Thingies('OrbletMarketBonus',6,0),5*level);
 for(const context of [forecast.initial,forecast.projected])for(const outpost of context.outposts)for(const bar of outpost.rankBars){
  assert.equal(bar.factors.find(f=>f.name==='Stronk Rank').value,1+level*.05);
 }
 for(let rank=0;rank<5;rank++){
  const current=call('BarExpRate',rank,1);
  g[23][6]=0;const baseline=call('BarExpRate',rank,1);g[23][6]=level;
  assert(Math.abs(current/baseline-(1+level*.05))<1e-10);
 }
 console.log(`Stronk level ${level}: native +${5*level}%; native and both forecasts x${1+level*.05} passed.`);
}
// Independently vary every supported Purity factor against the native total.
const auditClose=(actual,expected,label)=>assert(Math.abs(actual-expected)<=1e-9*Math.max(1,Math.abs(expected)),`${label}: ${actual} != ${expected}`);
let auditedPurityCases=0;
for(let scenario=0;scenario<48;scenario++){
 g[23][6]=scenario%51;g[2][26]=(scenario*7)%101;g[2][43]=scenario%17;g[2][72]=scenario%13;
 g[2][77]=scenario;g[3][7]=scenario%5;
 maps[1][2]=scenario%20;maps[1][4]=[0,10,100,10000][scenario%4];maps[1][7]=[0,99999,100000,1000000][scenario%4];maps[1][12]=scenario%2;
 maps[2][10]=1;maps[2][8]=scenario%3>0?1001:-1;maps[2][9]=scenario%3>1?1001:-1;
 for(const key of Object.keys(dns.h))delete dns.h[key];
 const context=box.DashboardMath.getPurityRankContext({...d,RoyalG:g,RoyalMaps:maps},p.account,p.characters);
 const b=context.outposts.find(o=>o.mapIndex===1).rankBars[4],f=Object.fromEntries(b.factors.map(x=>[x.name,x.value]));
 const expected={
 'Specialist Armory upgrade':1+call('UnitSpecEffect',7,0)/100,
 'Stronk Rank':1+env.m._customBlock_Thingies('OrbletMarketBonus',6,0)/100,
 'Spelunking Purity Hardhat':1+env.m._customBlock_Spelunk('ShopUpgBonus',65,0)/100,
 'State-Wide Propoganda (client-applied)':1,
 'Greater Education':1+call('OutpostLV_Bonuses',2,0)*maps[1][2]/100,
 'Glorification':maps[1][12]>=1?2:1,
 'Map purified':1+200*call('isMapPurified',1,0)/100,
 'Intel rank':1+call('OutpostEXPrank',1,1)*call('ArmoryUpgBonus',72,0)/100,
 'Support Camps (including Jelly)':1+call('SupportEXP',0,0)*call('TotalSupports',1,0)/100,
 'Jelly rank EXP':1+env.q._customBlock_JellyOperation('RoG_BonusQTY',1,0)/100
 };
 for(const [name,value] of Object.entries(expected))auditClose(f[name],value,name);
 auditClose(b.expPerUnit,call('BarExpRate',4,1),'Purity EXP per Priest');
 assert.equal(b.rank,call('OutpostEXPrank',1,4));assert.equal(b.required,call('OutpostEXPreq',1,4));assert.equal(b.previous,call('OutpostEXPreqPREV',1,4));
 auditClose(b.progress,(b.exp-b.previous)/(b.required-b.previous),'rank progress');
 auditedPurityCases++;
}
console.log(`${auditedPurityCases} independent Purity breakdown scenarios: all ten factors, native rate, rank, thresholds and progress passed.`);
// Verify the actual worker payload keeps saved progress and projected rates distinct.
for(const hours of [0,1,100,1000]){
 g[3][0]=hours*3600;g[2][30]=1;g[2][75]=1;g[23][6]=15;maps[1][7]=99000;
 const input={...raw,data:{...d,RoyalG:g,RoyalMaps:maps}};
 let payload;
 const workerBox={structuredClone,DashboardMath:box.DashboardMath,importScripts(){},postMessage(v){payload=v;}};workerBox.self=workerBox;
 vm.runInNewContext(fs.readFileSync('purity-worker.js','utf8'),workerBox);
 workerBox.onmessage({data:{raw:input}});
 assert(!payload.error,payload.error);
 const row=payload.rows.find(r=>r.id===1),b=row.bar;
 const expected=box.DashboardMath.getPurityForecast(input.data,p.account,p.characters);
 const before=expected.initial.outposts.find(o=>o.mapIndex===1).rankBars[4],after=expected.projected.outposts.find(o=>o.mapIndex===1).rankBars[4];
 assert.equal(b.exp,before.exp);assert.equal(b.required,before.required);assert.equal(b.rank,before.rank);assert.equal(b.progress,before.progress);
 auditClose(b.creditedExp,after.exp,'banked EXP');auditClose(b.expPerHour,after.expPerHour,'post-collection rate');assert.equal(b.pendingSeconds,hours*3600);
 assert.equal(b.factors.find(f=>f.name==='Stronk Rank').value,1.75);
 auditClose(row.supportSources.reduce((n,s)=>n+s.links,0),expected.initial.outposts.find(o=>o.mapIndex===1).supports,'support source links');
}
console.log('Actual worker payload: saved rank/EXP/progress, banked time/EXP, projected rates, Stronk and support labels passed at 0/1/100/1000 hours.');
// Boundary audit: native collection with multiple Priests and militia before/after them.
for(let scenario=0;scenario<120;scenario++){
 for(let i=0;i<maps.length;i++)maps[i]=[];
 const xp=[0,99998,99999,100000,999999,1000000][scenario%6];
 maps[1]=[5,0,scenario%8,0,[0,9.999,10,99,1000][scenario%5],0,0,xp,-1,-1,0,'555555555',scenario%2];
 for(let world=0;world<8;world++){g[6+world*2]=[];g[7+world*2]=[];}
 g[6]=[[7],[7,7],[4,7],[7,4],[4,7,7,4],[]][scenario%6];g[7]=g[6].map(()=>1);
 g[2][17]=scenario%2;g[2][26]=scenario%30;g[2][72]=scenario%7;g[2][75]=scenario%2;g[2][30]=scenario%2;g[23][6]=scenario%51;
 g[3][0]=[0,1,60,3600,86400,3600000][Math.floor(scenario/6)%6];
 for(const key of Object.keys(dns.h))delete dns.h[key];
 const forecast=box.DashboardMath.getPurityForecast({...d,RoyalG:g,RoyalMaps:maps},p.account,p.characters);
 collect.call({});
 const outpost=forecast.projected.outposts.find(o=>o.mapIndex===1);
 for(const bar of outpost.rankBars){
  auditClose(bar.exp,Number(maps[1][3+bar.type]),`boundary ${scenario} collected ${bar.name}`);
  assert.equal(bar.rank,call('OutpostEXPrank',1,bar.type));
  auditClose(bar.expPerUnit,call('BarExpRate',bar.type,1),`boundary ${scenario} resulting rate`);
 }
}
console.log('120 additional native collection boundary cases passed: exact Purity thresholds, mixed Priest/militia ordering, empty assignments, locked states and banked seconds.');

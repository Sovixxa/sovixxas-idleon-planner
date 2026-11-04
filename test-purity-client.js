'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{handler}=require('./client-source-utils');
const box={console,structuredClone};box.self=box;box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync('dashboard-math.js','utf8'),box);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),parse=x=>typeof x==='string'?JSON.parse(x):x,d=parse(raw.data),g=parse(d.RoyalG),maps=parse(d.RoyalMaps),research=parse(d.Research);
const p=box.DashboardMath.parseData({...d,OptLacc:d.OptLacc||d.OptionsListAccount},raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
let model=box.DashboardMath.getPurityRankContext(d,p.account,p.characters);
const source=fs.readFileSync('../audit/purity-live-N-nov01.js','utf8');
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
console.log('Fresh public client: Armory 77 levels 1/50/100 never activate its multiplier across all five selected ranks; runtime reads missing Spelunking slot 77.');
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
console.log('Native November 1 parity: all rank types across the saved outposts, plus assigned Priests, Purity rank 1, Hardhat, Jelly and Glorification scenarios passed.');

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


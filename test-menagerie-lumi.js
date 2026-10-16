'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{handler}=require('./client-source-utils');
const box={console};box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),box);
const source=fs.readFileSync('../audit/N.js','utf8'),catalog=require('./inspect-bonus-freshness').catalogs(source).values;
let checks=0;
for(const rank of [0,1,20,100])for(const level of [0,1,7])for(const wave of [0,25,200]){
 const men=Array.from({length:7},()=>Array(40).fill(0));men[0][2]=rank;men[0][4]=7;men[0][14]=3;men[3][1]=level;men[3][0]=2;men[2][8]=1;
 const opts=Array(630).fill(0);opts[620]=8;opts[628]=wave;opts[464]=9;
 const data={Menagerie:men,OptLacc:opts,Research:[],Spelunk:[],Atoms:Array(17).fill(4),ArcadeUpg:[],Gaming:[],CauldronInfo:[],Cards0:{w7b10:1},BundlesReceived:{ban_k:1,ban_l:0,ban_m:1},Tower:[]};
 const account={research:{gridSquares:{164:{bonuses:[17,2]},165:{bonuses:[21,1]}}},gaming:{superbitsUpgrades:{69:{unlocked:true}}},arcade:{shop:{73:{bonus:35}}},sneaking:{jadeEmporium:{47:{unlocked:true}}},zenith:{market:{11:{bonus:13}}},coralReef:{dancingCoral:{6:{bonus:29}}},cards:{w7b10:{rawName:'w7b10',amount:1,stars:4}},alchemy:{vials:[{stat:'7lumiadd',func:'add',level:3,x1:6,x2:0,multiplier:2}]}};
 const attrs={Menagerie:men,CustomLists:{h:{Research:catalog.get('Research')}},DNSM:{h:{AlchVials:{h:{'7lumiadd':36}}}}};
 const q={},env={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},q,m:{
  _customBlock_Thingies:(name,id)=>({CoralKidUpgBonus:40,ClamWorkBonus:1,ZenithMarketBonus:13,DancingCoralBonus:29,Have_ban_k:1,Have_ban_l:0,Have_ban_m:1})[name],
  _customBlock_GamingStatType:()=>1,_customBlock_Ninja:()=>1,
  _customBlock_ResearchStuff:(_,id,mode)=>account.research.gridSquares[id].bonuses[mode],_customBlock_AtomCollider:()=>8
 },p:{_customBlock_ArcadeBonus:()=>35,_customBlock_Breeding:(_,unused,index)=>catalog.get('RANDOlist')[115].filter(x=>wave>=Number(x)).length>index?1:0},x:{_customBlock_RunCodeOfTypeXforThingY:()=>5}};
 q._customBlock_MenagerieStuff=vm.runInNewContext('('+handler(source,'_customBlock_MenagerieStuff')+')',env);
 const actual=box.PrayerMath.getMenagerieAnalysis(data,account),expected=q._customBlock_MenagerieStuff('LumiGainRate',0,0);
 assert(actual.complete);assert(Math.abs(actual.rate-expected)<Math.max(1,expected)*1e-12,`${actual.rate} != ${expected}`);assert.equal(actual.missionSlots,9);checks++;
}
console.log(`Lumi/hour: ${checks} native-handler comparisons across ranks, boost levels, Crucible milestones, all source groups and export aliases pass.`);

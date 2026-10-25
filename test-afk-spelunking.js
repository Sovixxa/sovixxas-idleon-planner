'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{handler}=require('./client-source-utils');
const native=fs.readFileSync('../audit/N.js','utf8'),ctx={console,structuredClone};vm.runInNewContext(fs.readFileSync('prayer-math-engine.js','utf8'),ctx);const M=ctx.PrayerMath;
const nodes=require('./afk-spelunk-nodes.json');assert.equal(nodes.length,7);
for(const node of nodes){const match=native.match(new RegExp('G\\.addNewMonster\\("'+node.id+'",(\\{.*?\\})\\)'));assert(match);const monster=vm.runInNewContext('('+match[1]+')',{G:{ORE_TYPE:0}});assert.equal(node.exp,monster.ExpGiven);assert.equal(node.defence,monster.Defence);assert.equal(node.name,monster.Name.replace(/_/g,' '));assert(new RegExp('e\\.h\\['+node.map+'\\]="\\d+,'+node.id+'"').test(native));}
let bonus=0,chance=0;
const attrs={DNSM:{h:{AlchVials:{h:{'7spelunkspd':0}}}},DummyNumbersStatManager:{h:{}}};
const env={Math,a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},l:function(){this.h={};},k:{_customBlock_GetTalentNumber:(_mode,id)=>id===637?bonus:0},v:{_customBlock_EtcBonuses:()=>0},p:{_customBlock_MainframeBonus:()=>0},x:{_customBlock_RunCodeOfTypeXforThingY:()=>chance},m:{}};
const spelunk=vm.runInNewContext('('+handler(native,'_customBlock_Spelunk')+')',env);env.m._customBlock_Spelunk=(name,...args)=>name==='ChapterBonus'?0:spelunk(name,...args);
const hourly=vm.runInNewContext('('+handler(native,'_customBlock_HourlyKillRate')+')',env);
let checks=0;for(bonus of [0,25,100,999,1900,10000])for(chance of [0,.01,.2499,.25,.5,1]){const speed=spelunk('SpelunkingSpeed',0,0);assert.equal(M.spelunkingSpeed(bonus),speed);assert.equal(M.spelunkingActions(speed,chance),hourly('Spelunking'));checks++;}
assert.equal(M.harvestChance(24.9,100),0);assert(M.harvestChance(25,100)>0);
console.log('Spelunking: seven maps match native EXP/efficiency requirements; '+checks+' speed and action cases match the client.');
// Compare the real client's Spelunking AFK branch against the parser branch.
const afkNative=handler(native,'_customBlock_AFKgainrates');
const from=afkNative.indexOf('"Spelunking"==e'),until=afkNative.indexOf(':"Research"==e',from);
assert(from>=0&&until>from);
const parser=fs.readFileSync('vendor/idleon-toolbox/parsers/character.ts','utf8'),start=parser.indexOf("else if (afkType === 'SPELUNKING') {"),end=parser.indexOf('// The game shows no AFK gains rate',start);
const branch=parser.slice(start,end).replace(/^else if \(afkType === 'SPELUNKING'\) /,'');
const esbuild=require('esbuild');
for(const fish of [0,35,150])for(const multi of [1,1.7]){
 const dns={h:{AFKgainzzALL:999,AFKgainzzALLmulti:multi,AlchVials:{h:{'7skillw7afk':12}},StarSigns:{h:{SkillAFK:88}}}};
 const nativeEnv={Math,a:{engine:{getGameAttribute:()=>dns}},c:{asNumber:Number},m:{_customBlock_Spelunk:(key)=>key==='BigFishBonuses'?fish:0,_customBlock_Companions:()=>8},v:{_customBlock_CardBonusREAL:()=>16},k:{_customBlock_GetTalentNumber:()=>77},p:{_customBlock_TrappingStuffs:()=>33},q:{_customBlock_GetBribeBonus:()=>44}};
 const expected=vm.runInNewContext('(function(e){var t,i;return '+afkNative.slice(from,until)+':0;})',nativeEnv)('Spelunking');
 const parserEnv={Math,account:{companions:{list:Array.from({length:29},()=>({bonus:8}))}},afkMulti:multi,tickTockTalentBonus:77,actualBaseAfkGains:999,trappingBonus:33,starSignBonus:88,bribeAfkGains:44,getAdviceFishBonus:(_a,i)=>i===2?fish:999,getSpelunkingBonus:()=>999,isCompanionBonusActive:()=>true,getCardBonusByEffect:()=>16,getVialsBonusByStat:()=>12};
 const actual=vm.runInNewContext(esbuild.transformSync('(function(){let gains,breakdown=[];'+branch+'return gains;})',{loader:'ts'}).code,parserEnv)();
 assert.equal(actual,expected);
}
console.log('Spelunking AFK bonus branches match the client, including advice fish and zero generic-AFK scaling.');

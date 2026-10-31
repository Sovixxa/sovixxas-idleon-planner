 'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={importScripts(){},PrayerMath:{mapEnemiesArray:{1:'mob'},mapMonsterCounts:{1:20},getRespawnRate:()=>({respawnRate:30}),getTalentBonus:()=>50}};
vm.createContext(context);vm.runInContext(fs.readFileSync('shiny-time-worker.js','utf8'),context);
vm.runInContext("parsed={characters:[{flatTalents:[{name:'UWU_RAWRRR',level:100}]}]}",context);
const rate=(clear,uwu)=>vm.runInContext(`rate(0,1,${JSON.stringify(clear)},${uwu})`,context);
assert.equal(rate(2,false),2250); // 20 kills every 32 seconds.
assert.equal(rate(2,true),12000); // UWU cannot lower the 30-second respawn below 4 seconds.
assert.equal(rate('',true),null);
assert.equal(rate(0,true),null);
assert.equal(rate(6,true),7200);
vm.runInContext('parsed.characters[0].flatTalents=[]',context);
assert.equal(rate(2,true),2250); // A checkbox cannot invent an unlearned talent.
const {estimate}=require('./shiny-planner');
const result=estimate({level:1,maxLevel:20,progress:1},2,1,1,2400,true);
assert.equal(result.boost,2); // 2,400 * 50% * 3 = 3,600 extra seconds per hour.
assert.equal(result.active,result.passive/2);
console.log('Shiny map scenarios: clear time, UWU reduction and floor, missing input, unlearned talent and kill-to-progress conversion pass.');

Object.assign(context.PrayerMath,{
 mapDetails:{1:[[],[20,130]]},monsters:{mob:{MonsterHPTotal:100}},
 getMaxDamage:()=>({hitChance:50,movementSpeed:100,actionWaitTime:2}),
 getEffectiveDamage:()=>50,getMonsterHpTotal:hp=>hp
});
const auto=vm.runInContext('autoClear(0,1)',context);
assert.equal(auto.combatSeconds,160); // 20 monsters, two hits each, 50% hit chance, 2s per attack.
assert.equal(auto.travelSeconds,19);
assert.equal(auto.seconds,179);
assert.equal(vm.runInContext("rate(0,1,'',false,'auto')",context),72000/209);
assert.equal(rate(2,false),2250,'Measured mode keeps the explicit override');
context.PrayerMath.getMaxDamage=()=>({hitChance:0,movementSpeed:100,actionWaitTime:2});
vm.runInContext('clearCache.clear()',context);
assert.equal(vm.runInContext('autoClear(0,1)',context),null,'No estimate when attacks cannot hit');
context.PrayerMath.getMaxDamage=()=>({hitChance:100,movementSpeed:100,actionWaitTime:2});
context.PrayerMath.mapDetails={};vm.runInContext('clearCache.clear()',context);
assert.equal(vm.runInContext('autoClear(0,1)',context),null,'Missing spacing is not zero travel');
console.log('Automatic clear baseline: attack cadence, HP, accuracy, movement, manual override and missing stats pass.');

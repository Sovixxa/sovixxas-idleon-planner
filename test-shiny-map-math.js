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

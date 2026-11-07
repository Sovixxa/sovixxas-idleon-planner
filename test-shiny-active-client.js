'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('../audit/N.js','utf8');
const start=source.indexOf('.5<k._customBlock_GetTalentNumber(1,362)');
assert(start>=0);
const end=source.indexOf('q._customBlock_AFKcode("Pets",3)',start)+'q._customBlock_AFKcode("Pets",3)'.length;
const proc=source.slice(start,end);
let time=0,learned=1,enhanced=1,random=0;
const context={k:{_customBlock_GetTalentNumber:()=>learned},m:{_customBlock_TalentEnh:()=>enhanced},c:{randomFloat:()=>random},q:{_customBlock_AFKcode:(kind,seconds)=>{assert.equal(kind,'Pets');time+=seconds;}}};
for(let i=0;i<1000;i++){random=(i+.5)/1000;vm.runInNewContext(proc,context);}
assert.equal(time,1500,'1000 evenly spaced random draws advance Fenceyard by 1500 seconds');
for(const values of [[0,1],[1,0]]){[learned,enhanced]=values;random=0;vm.runInNewContext(proc,context);assert.equal(time,1500);}
const pets=source.indexOf('"Pets"==e?',source.indexOf('q._customBlock_AFKcode=function'));
const petsEnd=source.indexOf(':"Sailing"',pets);
const gen=[];gen[35]=7;
vm.runInNewContext(source.slice(pets+'"Pets"==e?'.length,petsEnd),{a:{engine:{getGameAttribute:()=>({22:{behaviors:{getBehavior:()=>({_GenINFO:gen})}}})}},n:{__cast:v=>v},hb:{},c:{asNumber:Number},t:3});
assert.equal(gen[35],10,'Proc advances the same Fenceyard seconds accumulator');
assert(source.includes('*p._customBlock_Breeding("ShinySpdMulti","0",0,0)/86400'));
assert(source.includes('150<=p._customBlock_getbonus2(1,49,-1)&&(a.engine.getGameAttribute("DNSM").h.TalENHNC.h[362]=1)'));
console.log('Native whale handler: learned/enhancement gates, 50% probability, 3 seconds, Fenceyard accumulator and day conversion pass.');

// Verify actual Bloodbone scene population, rather than relying on AFK table alone.
const spawn=source.indexOf('a.engine.gameAttributes.h.dummyMonsterTYPE="skele2"');
assert(spawn>=0);
assert.match(source.slice(spawn-450,spawn),/t=0;17>t;/);
assert(source.includes('Math.max(this._RespawnTime-x._customBlock_GetBuffBonuses(302,1),4)'));
const engine={console};vm.createContext(engine);vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),engine);
assert.equal(engine.PrayerMath.mapEnemiesArray[117],'skele2');
assert.equal(engine.PrayerMath.mapMonsterCounts[117],17);
const worker={importScripts(){},PrayerMath:{mapEnemiesArray:{117:'skele2'},mapMonsterCounts:{117:17},getRespawnRate:()=>({respawnRate:40}),getTalentBonus:()=>50}};
vm.createContext(worker);vm.runInContext(fs.readFileSync('shiny-time-worker.js','utf8'),worker);
vm.runInContext("parsed={characters:[{flatTalents:[{name:'UWU_RAWRRR',level:200}]}]}",worker);
const bloodbones=vm.runInContext("rate(0,117,2,true,'manual')",worker);
assert.equal(bloodbones,10200);
const boost=1+bloodbones*1.5/3600;
assert.equal(boost,5.25);
assert.equal(Math.ceil(4.9*60/boost),56);
assert.equal(Math.ceil(8*60/boost),92);
console.log('Bloodbones: native population 17, UWU floor 4s, 2s clear = 170 kills/min and 5.25x progress; 4.9h -> 56min, 8h -> 92min.');

// Execute the whole AFKcode function on the Pets branch, not only the assignment.
function nativeFunction(marker){const start=source.indexOf(marker)+marker.length;assert(start>=marker.length);let depth=0,quote='',escape=false;for(let i=start;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);}throw Error('Unclosed native function');}
const fullGen=[];fullGen[35]=0;
const afk=vm.runInNewContext('('+nativeFunction('q._customBlock_AFKcode=')+')',{a:{engine:{getGameAttribute:()=>({22:{behaviors:{getBehavior:()=>({_GenINFO:fullGen})}}})}},n:{__cast:v=>v},hb:{},c:{asNumber:Number}});
for(let i=0;i<100;i++)afk('Pets',3);
assert.equal(fullGen[35],300,'No hidden extra multiplier in complete Pets AFK handler');
// The native Fenceyard assignment independently converts accumulated seconds to days.
const assignmentStart=source.indexOf('a.engine.getGameAttribute("Breeding")[Math.round(22+this._DN2)][0|this._DN3]=');
assert(assignmentStart>=0);const assignment=source.slice(assignmentStart,source.indexOf(';break',assignmentStart));
const progress=Array.from({length:26},()=>[0]);const handler=vm.runInNewContext('(function(){'+assignment+';})',{a:{engine:{getGameAttribute:()=>progress}},c:{asNumber:Number},p:{_customBlock_Breeding:()=>100}});
handler.call({_DN2:0,_DN3:0,_GenINFO:Object.assign([],{35:60+170*1.5})});
assert.equal(progress[22][0],315*100/86400);
console.log('Whole native Pets handler and Fenceyard day conversion pass: no extra whale multiplier.');

assert.equal(engine.PrayerMath.mapMonsterCounts[2],34);
worker.PrayerMath.mapEnemiesArray[2]='frogG';worker.PrayerMath.mapMonsterCounts[2]=34;
const frogRate=vm.runInContext("rate(0,2,2,true,'manual')",worker);
assert.equal(frogRate,20400);
assert.equal(1+frogRate*1.5/3600,9.5);
assert.equal(Math.ceil(4.9*60/9.5),31);
console.log('Map-selection discrepancy reproduced: Froggy Fields gives 340 kills/min, 9.5x, and 4.9h -> 31min.');

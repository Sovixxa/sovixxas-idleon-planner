'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const native=fs.readFileSync('../audit/N.js','utf8');
function extract(marker){const start=native.indexOf(marker)+marker.length;assert(start>=marker.length);let depth=0,quote='',escape=false;for(let i=start;i<native.length;i++){const ch=native[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';}else if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return native.slice(start,i+1);}throw Error(marker);}
const source=fs.readFileSync('vendor/idleon-toolbox/parsers/character.ts','utf8');
const body=source.slice(source.indexOf('export const getClassExpMulti ='),source.indexOf('export const getDropRate =')).replace('export const','const');
const math={};for(const m of body.matchAll(/\b((?:get|is)[A-Z]\w*|lavaLog|notateExpMulti)\(/g))math[m[1]]=()=>0;
let scenario;
Object.assign(math,{getPrayerBonusAndCurse:()=>({bonus:0,curse:0}),getCharacterStatAccount:a=>a,getDeityLinkedIndex:()=>[],getStatsFromGear:()=>({value:0}),getCardBonusByEffect:(_cards,e)=>e==='multi'?scenario.card:0,isCompanionBonusActive:(_a,id)=>id in scenario.comps,isCompanionLvl2Active:()=>false,isSuperbitUnlocked:(_a,name)=>({unlocked:name==='Classy_Discoveries'&&scenario.classy}),getMeritocracyBonus:()=>scenario.meritoc,cardBonuses:{100:'multi'},Math});
vm.createContext(math);vm.runInContext(esbuild.transformSync(body+'\nglobalThis.evaluate=getClassExpMulti;',{loader:'ts'}).code,math);
const attrs={DNSM:{h:{AlchVials:{h:{'7classexp':0,MonsterEXP:0}},AlchBubbles:{h:{expACTIVE:0}},BoxRewards:{h:{monsterExp:0}},StarSigns:{h:{MainXP:0}}}},Lv0:[1825],Tasks:[[],[],[[0,0,0]]],GetPlayersUsernames:['A'],UserInfo:['A'],PlayerDATABASE:{h:{}},WeeklyBoss:{h:{}},BundlesReceived:{h:{}},OptionsListAccount:Array(700).fill(0),Divinity:Array(30).fill(0),Spelunk:[[],[],[],[],[],[],[]],PixelHelperActor:Array(27).fill({behaviors:{getBehavior:()=>({_GenINFO:Array(20).fill(0)})}})};
const proxy=handler=>new Proxy({}, {get:(_t,key)=>(...args)=>handler(key,args)});
const env={Math,a:{engine:{getGameAttribute:k=>{assert(k in attrs,k);return attrs[k];}}},c:{asNumber:Number},h:{string:String},n:{__cast:x=>x},ob:{},x:{_customBlock_TotalStats:()=>0,_customBlock_RunCodeOfTypeXforThingY:()=>scenario.spring,_customBlock_ArbitraryCode:()=>0},v:proxy((k,a)=>k==='_customBlock_CardBonusREAL'&&a[0]===100?scenario.card:0),k:proxy(()=>0),q:proxy(()=>0),m:proxy((k,a)=>k==='_customBlock_Companions'?(scenario.comps[a[0]]||0):k==='_customBlock_GamingStatType'&&a[1]===24?Number(scenario.classy):k==='_customBlock_Summoning2'&&a[0]==='MeritocBonusz'?scenario.meritoc:0),p:proxy(k=>k==='_customBlock_WorkbenchStuff'?1:0)};
env.x._customBlock_ExpMulti=vm.runInNewContext('('+extract('x._customBlock_ExpMulti=')+')',env);
let checks=0;
for(const card of [0,18,72,250])for(const comps of [{},{145:2},{145:3,128:.5},{128:.5,37:1,33:1}])for(const classy of [false,true])for(const spring of [0,1,6]){
 scenario={card,comps,classy,spring,meritoc:20};attrs.Spelunk[6]=Array(17).fill(0);attrs.OptionsListAccount[464]=999;
 const account={tasks:attrs.Tasks,companions:{list:[]},spelunking:{discoveriesCount:17},accountOptions:attrs.OptionsListAccount,cards:spring?{springEvent1:{rawName:'springEvent1',amount:1,stars:spring-1}}:{}};
 for(const [id,bonus]of Object.entries(comps))account.companions.list[id]={bonus};
 const ch={playerId:0,level:1825,stats:{luck:0}},actual=math.evaluate(ch,account,[ch]).value,expected=env.x._customBlock_ExpMulti(0);
 assert(Math.abs(actual/expected-1)<1e-12,JSON.stringify({scenario,actual,expected}));checks++;
}

// Lowest-character bonuses require the merit and a strictly lower level, not a tie.
scenario={card:0,comps:{},classy:false,spring:0,meritoc:0};
math.isSuperbitUnlocked=(_a,name)=>({unlocked:name==='Noobie_Gains'});
env.m=proxy((key,args)=>key==='_customBlock_GamingStatType'&&args[1]===19?1:0);
attrs.GetPlayersUsernames=['A','B'];
for(const merit of [0,1])for(const otherLevel of [1824,1825,1826]){
 attrs.Tasks[2][0][2]=merit;attrs.PlayerDATABASE.h.B={h:{Lv0:[otherLevel]}};
 const ch={playerId:0,level:1825,stats:{luck:0}},account={tasks:attrs.Tasks,accountOptions:attrs.OptionsListAccount};
 const actual=math.evaluate(ch,account,[ch,{playerId:1,level:otherLevel}]).value,expected=env.x._customBlock_ExpMulti(0);
 assert(Math.abs(actual/expected-1)<1e-12,`Lowest level merit ${merit}, other ${otherLevel}`);checks++;
}
const X=require('./afk-tester');const levelEnv={Math,a:{engine:{getGameAttribute:k=>attrs[k],gameAttributes:{h:attrs}}},c:{asNumber:Number},v:{_customBlock_TaskProgress:()=>{}},q:{_customBlock_UnlockHint:()=>{}},k:{_customBlock_TalentCalc:()=>0}};
attrs.ExpReq0=[0];const increase=vm.runInNewContext('('+extract('q._customBlock_IncreaseExpREQ=')+')',levelEnv);
let required=0;for(let level=1825;level<1850;level++){attrs.Lv0[0]=level;increase(0);required+=attrs.ExpReq0[0];assert(Math.abs(X.requirement(level)/attrs.ExpReq0[0]-1)<1e-12);}
const projection=X.calculate({level:1825,progress:0,rate:1.4857271469874e35},1850);
assert(Math.abs(projection.remaining/required-1)<1e-12);assert.equal(projection.hours,required/1.4857271469874e35);
console.log(`AFK EXP client audit: ${checks} independent native class-EXP cases plus levels 1825–1849 and time arithmetic passed.`);



// Check every supported combat map's enemy EXP directly against the game catalog.
const monsters={};for(const m of native.matchAll(/G\.addNewMonster\("([^"]+)",(\{.*?\})\)/g))monsters[m[1]]=vm.runInNewContext('('+m[2]+')',{G:{MONSTER_TYPE:0}});
vm.runInThisContext(fs.readFileSync('prayer-math-engine.js','utf8'));
let mapsChecked=0;for(const [key,target] of Object.entries(PrayerMath.mapEnemiesArray)){const monster=PrayerMath.monsters[target];if(Number(key)>=350||monster?.AFKtype!=='FIGHTING'||!PrayerMath.mapDetails[key]?.[1]?.[0])continue;assert(monsters[target],target);for(const field of ['ExpGiven','MonsterHPTotal','Defence','RespawnTime','MoveSPEED','Damages'])assert.deepEqual(monster[field],JSON.parse(JSON.stringify(monsters[target][field])),'Map '+key+' '+field);mapsChecked++;}
assert(mapsChecked>100);console.log('Native combat-map EXP checked:',mapsChecked);

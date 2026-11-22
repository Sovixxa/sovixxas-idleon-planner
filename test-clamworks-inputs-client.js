'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{handler}=require('./client-source-utils');
const c={console,structuredClone,setTimeout};vm.createContext(c);
vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),c);
const M=c.PrayerMath,raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
const parsed=M.parseData(raw.data,raw.charNames,raw.companion,raw.guildData,raw.serverVars,raw.accountCreateTime,raw.tournament);
const clone=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const source=fs.readFileSync('../audit/live-N-nov15-hotfix-check.js','utf8'),damage=handler(source,'_customBlock_DamageDealed');
const talents=Object.values(require('./vendor/idleon-toolbox/data/website-data/talents.json')).flatMap(Object.values);
const ch={...parsed.characters[3],mapIndex:306,targetMonster:'w7a6'};
const sourceValue=(stats,name)=>stats.damageBreakdown.categories.flatMap(cat=>[...(cat.sources||[]),...(cat.subSections||[]).flatMap(s=>s.sources||[])]).find(s=>s.name===name)?.value;
// DamageDealed explicitly asks for the Y value; HP/accuracy/defence still use X.
for(const [id,name,label,sign] of [[108,'NO_PAIN_NO_GAIN','No Pain No Gain',1],[124,'BALANCED_SPIRIT','Balanced Spirit',-1]]){
 assert(damage.includes(`_customBlock_GetBuffBonuses(${id},2)`));
 const definition=talents.find(t=>t.skillIndex===id);
 for(const level of [1,50,150,350]){
  const talent={...definition,level};
  const stats=M.getMaxDamage({...ch,activeBuffs:[talent]},parsed.characters,parsed.account);
  const y=definition.y1*level/(level+definition.y2);
  near(sourceValue(stats,label),sign*y);
  if(id===108){
   const without=M.getMaxDamage({...ch,activeBuffs:[]},parsed.characters,parsed.account);
   near(stats.maxHp,without.maxHp*(1-definition.x1*level/(level+definition.x2)/100));
  }
 }
}
// MSA_Bonus(0) uses superbit 7, independently of skill-XP superbit 16.
let enabled=new Set(),waves=0;
const gen=Array(115).fill(0),actor={_GenINFO:gen},gaming={};
gaming._customBlock_GamingStatType=vm.runInNewContext('('+handler(source,'_customBlock_GamingStatType')+')',{
 a:{engine:{getGameAttribute:()=>Array.from({length:9},()=>({behaviors:{getBehavior:()=>actor}}))}},
 n:{__cast:x=>x},ma:{},c:{asNumber:Number},m:{_customBlock_GamingStatType:(_key,id)=>enabled.has(id)?1:0}
});
for(const totalizer of [false,true])for(const skill of [false,true])for(waves of [0,9,10,1009]){
 gen[114]=waves;enabled=new Set([...(totalizer?[7]:[]),...(skill?[16]:[])]);
 const account=clone(parsed.account);
 account.gaming.superbitsUpgrades=[{name:'MSA_Totalizer',unlocked:totalizer,bonus:Math.floor(waves/10)},{name:'MSA_Skill_EXP',unlocked:skill,bonus:Math.floor(waves/10)}];
 const stats=M.getMaxDamage(ch,parsed.characters,account);
 near(sourceValue(stats,'Superbit'),gaming._customBlock_GamingStatType('MSA_Bonus',0,0));
}
// The base-damage event card is passive: no equipped-card slot is required.
assert.match(damage,/_customBlock_RunCodeOfTypeXforThingY\("CardLv","fallEvent2"\)/);
for(const amount of [0,1])for(const stars of [0,3,6]){
 const account=clone(parsed.account);
 account.cards.TestAutumn={rawName:'fallEvent2',amount,stars};
 for(const [key,value] of Object.entries(account.cards))if(value.rawName==='fallEvent2'&&key!=='TestAutumn')delete account.cards[key];
 near(sourceValue(M.getMaxDamage(ch,parsed.characters,account),'Autumn Event Card'),amount?stars+1:0);
}
// Run the native personal Bonus_Minor path, including its slot -> bonus-ID mapping.
const gods=require('./inspect-bonus-freshness').catalogs(source).values.get('GodsInfo');
const cosmo=require('./vendor/idleon-toolbox/data/website-data/shared-data.json').cosmoUpgrades;
let doot=false,pocket=-1,research=false;
const div=Array(40).fill(0),gem=Array(10).fill(0),opt=Array(622).fill(0),levels=Array(16).fill(0),skills=Array(506).fill(0);
levels[14]=100;
const attrs={Divinity:div,GemItemsPurchased:gem,OptionsListAccount:opt,CustomLists:{h:{GodsInfo:gods}},DNSM:{h:{AlchBubbles:{h:{Y2ACTIVE:1}}}},GetPlayersUsernames:['Test'],UserInfo:['Test'],Lv0:levels,PlayerDATABASE:{h:{Test:{h:{SkillLevels:skills,Lv0:levels}}}}};
const native={_customBlock_Companions:()=>doot?1:0,_customBlock_Holes:(_key,id)=>id===pocket?1:0,_customBlock_ResearchStuff:()=>research?1:0,_customBlock_Thingies:()=>0};
native._customBlock_Companions=vm.runInNewContext('('+handler(source,'_customBlock_Companions')+')',{a:{engine:{getGameAttribute:key=>attrs[key]}},c:{asNumber:Number}});
native._customBlock_Divinity=vm.runInNewContext('('+handler(source,'_customBlock_Divinity')+')',{a:{engine:{getGameAttribute:key=>attrs[key]}},c:{asNumber:Number,getCurrentSceneName:()=> 'World7'},h:{string:String},m:native});
let checks=0;
for(const god of [0,2,7])for(const mode of ['none','normal','second','locked-second','unlinked-second','doot','pocket','research','gem','coral']){
 const slot=gods.findIndex(row=>Number(row[13])===god);
 doot=mode==='doot';pocket=mode==='pocket'?god:-1;research=mode==='research';gem[9]=mode==='gem'?1:0;opt[425]=mode==='coral'?slot+1:0;
 attrs.DNSM.h.CompanionBon={h:{0:doot?1:0}};
 div[12]=['none','unlinked-second','doot','pocket','research','gem','coral'].includes(mode)?-1:mode==='normal'?slot:(slot+1)%10;
 div[25]=mode==='locked-second'?slot:10;skills[505]=mode.includes('second')?10+slot:0;
 const account={accountOptions:opt,companions:{list:[{acquired:doot}]},divinity:{linkedDeities:[div[12]],unlockedDeities:div[25]},gemShopPurchases:gem,research:{gridSquares:{173:{bonuses:[research?1:0]}}},hole:{holesObject:{idleonMajiks:[mode==='pocket'?1/Number(cosmo[2][0].x0):0],extraCalculations:{29:slot,30:-1}}}};
 const character={playerId:0,skillsInfo:{divinity:{level:100}},equippedBubbles:[],secondLinkedDeityIndex:skills[505]>0?slot:undefined};
 near(M.getActiveMinorDivinityBonus(character,account,god),native._customBlock_Divinity('Bonus_Minor',0,god));checks++;
}
for(const level of [0,1,2,100]){
 levels[14]=level;attrs.DNSM.h.CompanionBon={h:{0:1}};pocket=-1;research=false;gem[9]=0;div[12]=-1;skills[505]=0;
 const account={companions:{list:[{acquired:true}]},divinity:{linkedDeities:[-1]}};
 const character={playerId:0,skillsInfo:{divinity:{level}},equippedBubbles:[]};
 near(M.getActiveMinorDivinityBonus(character,account,7),native._customBlock_Divinity('Bonus_Minor',0,7));checks++;
}
console.log(`Clamworks inputs: buff X/Y values, 16 native MSA cases, passive event card, ${checks} native personal Divinity link cases passed.`);

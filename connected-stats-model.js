(function(root){
'use strict';
const pretty=s=>String(s).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ').replace(/^./,c=>c.toUpperCase());
const at=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
// Keep the decoder's pools intact. A category named Multiplicative can contain
// percentage inputs, factors, or special rules; never infer operations from it.
function sources(breakdown){
 const rows=[];
 function walk(b,stage='Source values'){
  if(Array.isArray(b)){for(const r of b){if(r.title)stage=r.title;else if(r.name&&r.value!==undefined)rows.push({name:r.name,value:r.value,stage,display:r.formatted||null});}return;}
  if(!b||typeof b!=='object')return;
  for(const c of b.categories||[]){walk(c.sources,c.name);for(const s of c.subSections||[])walk(s.sources,`${c.name} · ${s.name}`);}
 }
 walk(breakdown);return rows;
}
function calculate(raw,M=root.PrayerMath){
 const T=root.ConnectedTrace;T?.reset();
 const copy=structuredClone(raw),data=typeof copy.data==='string'?JSON.parse(copy.data):copy.data||copy;
 if(!Object.keys(data).some(k=>/^CharacterClass_\d+$/.test(k)))return {characters:[],account:[]};
 const p=M.parseData(data,copy.charNames,copy.companion,copy.guildData,copy.serverVars||{},copy.accountCreateTime,copy.tournament),a=p.account,chars=p.characters;
 const traceNames={maxHp:'getMaxHp',maxMp:'getMaxMp',accuracy:'getAccuracy',critChance:'getCritChance',critDamage:'getCritDamage',movementSpeed:'getPlayerSpeedBonus',mastery:'getMastery',hitChance:'getHitChance',survivability:'getSurvivability',miningEff:'getMiningEff',allEff:'getAllEff',allExp:'getAllSkillsExp',sample:'getPrinterSampleRate',boostFood:'getPlayerFoodBonus',healthFood:'getPlayerFoodBonus',maxCharge:'getMaxCharge',chargeRate:'getChargeRate',characterBuild:'getPlayerConstructionSpeed',cookingEff:'getCookingEff',labEff:'getLabEfficiency',spelunkEff:'getSpelunkingEfficiency'};
 const accountTrace={
  'construction.totalBuildRate':['scorePlacement','result.totalBuildRate'],
  'construction.totalFlaggyRate':['parseFlags','result.totalFlaggyRate'],
  'construction.totalPlayerExpRate':['scorePlacement','result.totalPlayerExpRate'],
  'research.researchEXPrateTOT':['getResearch','result.researchEXPrateTOT'],
  'equinox.chargeRate':['parseEquinox','result.chargeRate'],
  'sailing.maxChests':['parseSailing','result.maxChests'],
  'summoning.armyHealth':['getArmyHealth','result'],
  'summoning.armyDamage':['getArmyDamage','result'],
  'farming.rankMulti':['parseFarming','result.rankMulti'],
  'farming.pctExoticPurchasesFree':['parseFarming','result.pctExoticPurchasesFree'],
  'gaming.newMutationChance':['parseGaming','result.newMutationChance']
 };
 const accountTraces=Object.fromEntries(Object.entries(accountTrace).map(([id,args])=>[id,T?.get(...args)]));
 function add(list,id,title,value,unit,group,breakdown,note='',benefit='',overrideTrace){
  let trace=overrideTrace||accountTraces[id.replace(/^account\./,'')]||(traceNames[id]?T?.get(traceNames[id],id==='allExp'?'result.value':'result'):id.startsWith('exp.')?T?.get('getSkillExpMulti','result.value'):id.startsWith('afk.')?T?.get('getAfkGain','result.afkGains'):id.startsWith('capacity.')?T?.get('getItemCapacity','result.value'):null);
  if(trace){trace=structuredClone(trace);const conversions={mastery:'Multiply the mastery fraction by 100 to display percent.',sample:'Apply the effective sample-rate cap: min(90, uncapped sample rate).',maxCharge:'Round the calculated charge capacity as the Worship display does.',chargeRate:'Round the calculated charge rate as the Worship display does.'};
   const rule=id.startsWith('afk.')||id==='account.gaming.newMutationChance'?'Multiply the chance or rate fraction by 100 to display percent.':conversions[id];
   if(rule&&Number.isFinite(value))trace.rows.push({name:'Displayed total',value,formula:rule,parents:[trace.rows.length-1],id:'display'});
   trace.displayValue=value;
  }
  const rows=sources(breakdown);list.push({id,title,value:Number.isFinite(value)?value:null,unit,group,rows,trace,note:note||'Source values retain their original calculation pools. Percentage inputs and factors are not interchangeable.',benefit});
 }
 const account=[];
 function harvest(o,path='',depth=0){
  if(!o||typeof o!=='object'||depth>7||Array.isArray(o))return;
  for(const [key,b]of Object.entries(o)){
   if(/breakdown$/i.test(key)&&b?.categories){
    const base=key.replace(/Breakdown$/,'');let value=key==='breakdown'?o.value:o[base];
    if(!Number.isFinite(value)&&Number.isFinite(b.totalValue))value=b.totalValue;
    if(path==='upgradeVault.costReduction')value=o.cheaperFactor;
    if(!Number.isFinite(value))continue;
    const system=path.split('.')[0];
    add(account,'account.'+path+'.'+key,`${pretty(path.includes('caverns.')?path.split('.').slice(2).join(' · '):system)} · ${b.statName||pretty(base)}`,value,'',pretty(system),b,'Account-wide decoded total; source values keep the units and pools used by this system.',system);
   }else if(!/breakdown/i.test(key))harvest(b,path?path+'.'+key:key,depth+1);
  }
 }
 harvest(a);
 const accountFields=[
  ['construction.totalBuildRate','Total construction build rate',' / hr','Construction','construction'],
  ['construction.totalFlaggyRate','Flag digging rate',' / hr','Construction','construction'],
  ['construction.totalPlayerExpRate','Construction EXP rate',' / hr','Construction','construction'],
  ['research.researchEXPrateTOT','Research EXP rate',' / hr','Research','world7'],
  ['equinox.chargeRate','Equinox charge rate',' / hr','Equinox','other'],
  ['sailing.minimumTravelTime','Minimum sailing travel time',' min','Sailing','sailing'],
  ['sailing.maxChests','Sailing chest capacity',' chests','Sailing','sailing'],
  ['summoning.armyHealth','Summoning health','','Summoning','summoning'],
  ['summoning.armyDamage','Summoning damage','','Summoning','summoning'],
  ['farming.rankMulti','Farming land rank EXP multiplier','×','Farming','farming'],
  ['farming.pctExoticPurchasesFree','Free exotic purchase chance','%','Farming','farming'],
  ['gaming.newMutationChance','Gaming mutation chance','× chance','Gaming','gaming']
 ];
 for(const [path,title,unit,group,benefit]of accountFields){let value=at(a,path);if(path==='gaming.newMutationChance')value*=100;add(account,'account.'+path,title,value,path==='gaming.newMutationChance'?'%':unit,group,at(a,path+'Breakdown'),'',benefit);}
 try{const r=M.getBitsMulti(a);add(account,'bits','Gaming bits multiplier',r.value,'×','Gaming',r.breakdown,'','gaming');}catch{}
 const characters=chars.map(ch=>{
  const entries=[],safe=(id,title,unit,group,fn,benefit='',note='')=>{try{const r=fn(),v=typeof r==='number'?r:r?.value;add(entries,id,title,v,unit,group,r?.breakdown,note,benefit);}catch(error){add(entries,id,title,null,unit,group,null,error.message,benefit);}};
  let damage;try{damage=M.getMaxDamage(ch,chars,a);}catch{}
  for(const [key,title,unit,scale]of [['maxHp','Max HP','',1],['maxMp','Max MP','',1],['accuracy','Accuracy','',1],['critChance','Critical chance','%',1],['critDamage','Critical damage','×',1],['movementSpeed','Movement speed','%',1],['mastery','Damage mastery','%',100],['defence','Defence','',1],['hitChance','Hit chance','%',1],['survivability','Survivability','%',1],['miningEff','Mining efficiency','',1],['killPerkill','Kill credit per kill','×',1],['finalKillsPerHour','AFK kill credit',' / hr',1]]){
   const r=damage?.[key],killTrace=key==='finalKillsPerHour'&&damage?{value:r,rows:[{name:'Kills per hour before AFK and kill credit',value:damage.killsPerHour,formula:'Saved-map kill rate from damage, hit chance, respawn interval and attack effectiveness.',parents:[],id:'killsPerHour'},{name:'AFK gains multiplier',value:damage.afkGains,formula:'Activity AFK gain fraction; 1 means 100%.',parents:[],id:'afkGains'},{name:'Survivability',value:damage.survivability,formula:'Percent of time surviving the saved target.',parents:[],id:'survivability'},{name:'Kill credit per kill',value:damage.killPerkill?.value,formula:'Includes multikill and kill-credit bonuses.',parents:[],id:'killPerkill'},{name:'AFK kill credit per hour',value:r,formula:'floor(Kills per hour × AFK gains multiplier × (Survivability ÷ 100) × Kill credit per kill)',parents:[0,1,2,3],id:'result'}]}:null;add(entries,key,title,(typeof r==='object'?r?.value:r)*scale,unit,key==='miningEff'?'Skilling':'Combat',r?.breakdown,['hitChance','survivability','finalKillsPerHour','killPerkill'].includes(key)?'Calculated for the saved map and target; changing the target changes this value.':'',key==='miningEff'?'mining':'combat',killTrace);
  }
  const primary=root.ConnectedPrimaryStats&&M.getStatsFromGear?root.ConnectedPrimaryStats.calculate(ch,a,chars,M):null;
  for(const [index,key,title]of [[0,'strength','STR'],[1,'agility','AGI'],[2,'wisdom','WIS'],[3,'luck','LUK']]){
   const result=primary?.[index];
   add(entries,key,title,ch.stats?.[key],'','Stats',null,result?'Saved in-game total. The source reconstruction below is calculated independently from the exported setup.':'Saved in-game total.','stats',{value:ch.stats?.[key],rows:[{name:`Saved ${title}`,value:ch.stats?.[key],formula:`Character ${ch.playerId+1} → Personal Values → Stat List → entry ${index+1}.`,parents:[],id:'saved'}]});
   if(result){const entry=entries[entries.length-1];entry.primary=result;entry.rows=result.rows;entry.trace=null;}
  }
  safe('cash','Monster money','×','Combat',()=>{const r=M.getCashMulti(ch,a,chars);return {...r,value:r.cashMulti};},'drops');
  safe('respawn','Monster respawn interval',' sec','Combat',()=>{const r=M.getRespawnRate(ch,a);return {...r,value:r.respawnRate};},'afk','Saved-map respawn interval. Lower is faster; the popup source values are respawn bonuses, not seconds.');
  safe('cookingEff','Cooking efficiency','','Skilling',()=>M.getCookingEff(ch,chars,a,damage),'cooking');
  safe('labEff','Laboratory efficiency','','Skilling',()=>M.getLabEfficiency(ch,chars,a,damage),'lab');
  safe('spelunkEff','Spelunking efficiency','','Skilling',()=>M.getSpelunkingEfficiency(ch,chars,a),'world7');
  safe('allEff','All-skill efficiency multiplier','×','Skilling',()=>M.getAllEff(ch,chars,a),'skilling');
  safe('allExp','All-skill EXP','%','Skilling',()=>M.getAllSkillsExp(ch,chars,a),'exp');
  safe('sample','Printer sample rate','%','Production',()=>Math.min(90,M.getPrinterSampleRate(ch,a,a.charactersLevels)),'construction','Effective sample rate, capped at 90%. The uncapped character input can exceed this limit.');
  safe('goldFood','Golden food effect','×','Food',()=>M.getGoldenFoodMulti(ch,a,chars),'progress');
  safe('boostFood','Boost food effect','×','Food',()=>M.getPlayerFoodBonus(ch,a,false),'progress');
  safe('healthFood','Health food effect','×','Food',()=>M.getPlayerFoodBonus(ch,a,true),'combat');
  add(entries,'crystal','Crystal spawn chance',ch.crystalSpawnChance?.effectiveValue*100,'%','Combat',ch.crystalSpawnChance?.breakdown,'Effective chance after applicable caps.','drops');
  for(const [key,title,unit]of [['maxCharge','Worship max charge',''],['chargeRate','Worship charge rate',' / hr']]){M[key==='maxCharge'?'getMaxCharge':'getChargeRate']?.(ch,a);add(entries,key,title,ch.worship?.[key],unit,'Worship',null,'','worship');}
  M.getPlayerConstructionSpeed?.(ch,a);add(entries,'characterBuild','Character build speed',ch.constructionSpeed,' / hr','Construction',null,'Character contribution; the account construction total also includes board bonuses.','construction');
  add(entries,'talentLevels','Added talent levels',ch.addedLevels,' levels','Stats',ch.addedLevelsBreakdown,'','stats');
  for(const skill of Object.keys(ch.skillsInfo||{}).filter(s=>!['class','character','spelunking','research'].includes(s)))safe('exp.'+skill,pretty(skill)+' EXP','×','Skill EXP',()=>M.getSkillExpMulti(skill,ch,chars,a,damage),'exp');
  for(const [type,title]of [['FIGHTING','Fighting'],['MINING','Mining'],['CHOPPIN','Chopping'],['FISHING','Fishing'],['CATCHING','Catching'],['COOKING','Cooking'],['LABORATORY','Laboratory'],['DIVINITY','Divinity'],['SPELUNKING','Spelunking']])safe('afk.'+type,title+' AFK gains','%','AFK gains',()=>{const r=M.getAfkGain({...ch,afkType:type},chars,a);return {...r,value:r.afkGains===null?null:r.afkGains*100};},'afk','Calculated for this activity using the saved equipment and talents. Switching activities in game may require a different loadout.');
  for(const [type,title]of [['bCraft','Materials'],['bOre','Ore'],['bLog','Logs'],['dFish','Fish'],['dBugs','Bugs'],['cFood','Food'],['dCritters','Critters'],['dSouls','Souls']])safe('capacity.'+type,title+' carry capacity',' / slot','Carry capacity',()=>M.getItemCapacity(type,ch,a,false),'carry','Per-slot capacity on the saved map. Multipliers apply in separate pools before the hard cap and rounding.');
  safe('jade','Sneaking jade gain',' / hr','Sneaking',()=>{const r=M.getJadeRateBreakdown(ch,a);return {value:r.value,breakdown:{categories:[{name:'Multipliers',sources:Object.entries(r.factors).map(([name,value])=>({name,value}))}]}};},'sneaking','Uses the saved Sneaking floor and mastery. Every listed factor multiplies the jade rate.');
  return {id:ch.playerId,name:ch.name,entries};
 });
 return {characters,account};
}
const api={calculate,sources};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ConnectedStatsModel=api;
})(typeof self!=='undefined'?self:globalThis);

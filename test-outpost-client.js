'use strict';
// Independent evaluation of the local client's actual return expressions.
// No game runtime is started, and no saves are changed.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const file=process.argv[2]||'../audit/live-N-third-pass-2026-09-28.js';
const source=fs.readFileSync(file,'utf8');
const expression=name=>{const marker=`if("${name}"==d)return`,start=source.indexOf(marker);assert(start>=0,name);return source.slice(start+marker.length,source.indexOf(';',start));};
const names=['XtraClearKillz','ActiveKillClear','UnitSpecEffect','RI_chance','RI_mobs'];
const expressions=Object.fromEntries(names.map(name=>[name,expression(name)]));
const box={console,structuredClone,setTimeout,clearTimeout};box.self=box;box.window=box;vm.createContext(box);
vm.runInContext(fs.readFileSync('dashboard-math.js','utf8'),box);vm.runInContext(fs.readFileSync('royal-armory-data.js','utf8'),box);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),parse=v=>typeof v==='string'?JSON.parse(v):v,data=parse(raw.data),g=parse(data.RoyalG),research=parse(data.Research);
const parsed=box.DashboardMath.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const contexts=box.DashboardMath.getOutpostCombatContext(parsed.account,parsed.characters,data,[116]);
const catalog=box.ROYAL_ARMORY_CATALOG;
const start=source.indexOf('db.Research=function()'),end=source.indexOf('};',start);
const clientResearch=vm.runInNewContext('('+source.slice(start+'db.Research='.length,end+1)+')()');
assert.equal(Number(clientResearch[47][8]),25);assert.equal(Number(clientResearch[47][2]),25);assert.equal(Number(clientResearch[47][35]),1);assert.equal(Number(clientResearch[47][56]),1);
for(const context of contexts){
 const character=parsed.characters[context.index];
 const grow=(talent,variant)=>{if(!talent||talent.level<=0)return 0;const func=talent[variant==='x'?'funcX':'funcY'],p=talent[variant+'1'],q=talent[variant+'2'],level=talent.level;if(func==='decay')return p*level/(level+q);if(func==='intervalAdd')return p+Math.floor(level/q);throw Error('Unexpected growth '+func);};
 const environment={Math,d:'',b:0,e:0,k:{_customBlock_GetTalentNumber:(variant,id)=>grow(character.flatTalents.find(t=>t.skillIndex===id),variant===1?'x':'y')},p:{_customBlock_getbonus2:()=>context.warbound},q:{_customBlock_JellyOperation:(key,id)=>Number(research[7][9])>id?Number(clientResearch[47][id]):0},a:{engine:{getGameAttribute:key=>{assert.equal(key,'CurrentMap');return 116;}}}};
 const orblet=id=>Math.floor(Number(g[23][id])*catalog.orbletMarket.find(u=>u.index===id).bonusPerLevel);
 environment.m={_customBlock_RoyalG:(key,b=0,e=0)=>{
  if(key==='ArmoryUpgBonus')return Number(g[2][b])*catalog.upgrades.find(u=>u.index===b).bonusPerLevel;
  if(key==='isMapPurified')return 0;
  assert(expressions[key],key);return vm.runInNewContext(expressions[key],{...environment,d:key,b,e});
 },_customBlock_Thingies:(key,id)=>{assert.equal(key,'OrbletMarketBonus');return orblet(id);},_customBlock_Spelunk:(key,id)=>{assert.equal(key,'BigFishBonuses');assert.equal(id,6);return context.fish;},_customBlock_SushiStuff:(key,id)=>{
  assert.equal(key,'RoG_BonusQTY');assert.equal(id,61);
  // Use the actual client's reward table, not the estimator's reported result.
  return parsed.account.sushiStation.uniqueSushi>id?Number(clientResearch[37][id]):0;
 }};
 const crystal=context.maps[0].crystal,src=crystal.sources;
 const cryEnv={Math,d:'CrystalSpawn',c:{asNumber:Number},a:{engine:{getGameAttribute:key=>{assert.equal(key,'DNSM');return {h:{BoxRewards:{h:{CrystalSpawn:src['Post Office']}}}};}}},
  k:{_customBlock_GetTalentNumber:(_,id)=>id===26?src['Cmon Out Crystals']:src['Crystals 4 Days'],_customBlock_StampBonusOfTypeX:()=>src['Crystallin Stamp']},
  p:{_customBlock_Shrine:()=>src['Crystal Shrine Crescent']},q:environment.q,
  m:{_customBlock_Summoning:()=>src['Event Shop']/5,_customBlock_Companions:()=>src['Companion (Armadillo)']},
  w:{_customBlock_CardBonusREAL:()=>src['Poop Card']+src['Demon Genie Card']}};
 assert(Math.abs(vm.runInNewContext(expression('CrystalSpawn'),cryEnv)-crystal.rawChance)<1e-12,'Crystal formula matches newer client');
 assert.equal(crystal.chance,Math.min(vm.runInNewContext(expression('CrystalSpawnCAP'),{d:'CrystalSpawnCAP'}),crystal.rawChance));
 const run=(key,b=0)=>environment.m._customBlock_RoyalG(key,b);
 assert(Math.abs(run('ActiveKillClear')-context.creditPerKill)<1e-9);
 assert(Math.abs(run('UnitSpecEffect',4)-context.militiaPerHour)<1e-7);
 assert(Math.abs(Math.min(1,run('RI_chance'))-context.riChance)<1e-9);
 assert.equal(run('RI_mobs'),context.riMobs);
}
assert(source.includes('Math.max(this._RespawnTime-x._customBlock_GetBuffBonuses(302,1),4)'));
assert(source.includes('x._customBlock_AddBuffType(167,60)'));
assert(source.includes('c.runLater(2400,function(d)'));
assert(source.includes('k._customBlock_GetTalentNumber(1,165)+20*m._customBlock_TalentEnh(165)'));
assert(source.includes('1E3*Math.ceil(k._customBlock_GetTalentNumber(1,227))'));
console.log('Local client audit: actual active/militia/Regal expressions match both saved RG builds; Jelly values, active respawn floor, DI duration/revive delay and disciple duration rules verified.');

assert(source.includes('0==this._MonsterType.indexOf("Crystal")&&c.randomFloat()<q._customBlock_chipBonuses("crys")'));
assert(source.includes('g=15*c.asNumber(r.h[O].h.MonsterHPTotal)'));
assert(source.includes('g=2.5*c.asNumber(r.h[O].h.Defence)'));
console.log('Crystal spawn formula, cap, Jelly, Chocolatey death chains, HP and defence verified against local client.');

assert(source.includes('if("crystalmob_DropMulti"==d)return 0==b.indexOf("Crystal")?x._customBlock_ArbitraryCode("CrystalEmbiggener"):1'));
assert(source.includes('Math.min(2,1+(m._customBlock_ResearchStuff("Grid_Bonus",191,0)/100+c.randomFloat()))'));
assert(source.includes('k._customBlock_GetTalentNumber(1,168)+k._customBlock_GetTalentNumber(1,228)'));
assert(/BundlesReceived"\)\.h\.bon_a&&\s*\(a.engine.getGameAttribute\("DummyNumbersStatManager"\)\.h\.DamageDealtLIST\[2\]=1\.5\*/.test(source));
console.log('Orb duration, Regal/Royal Rewards counter increment, crystal Embiggener counter weight and purchased damage multiplier confirmed.');

// Independently validate every published requirement, including Wurm Highway.
const sourceFunction=(name,env={})=>{const start=source.indexOf(name+'=function()');assert(start>=0,name);const end=source.indexOf('};',start);return vm.runInNewContext('('+source.slice(start+name.length+1,end+1)+')()',env);};
const details=sourceFunction('ja.MapDetails');
const overrides=sourceFunction('Ia.RG_KillReq',{l:function(){this.h={};}});
const reqExpression=expression('OutpostKillsReq');
const mapCatalog=require('./outpost-eta-data').maps;
for(const meta of mapCatalog){
 const expected=vm.runInNewContext(reqExpression,{Math,Object,b:meta.id,d:'OutpostKillsReq',c:{asNumber:Number},a:{engine:{getGameAttribute:key=>key==='CustomMaps'?{h:{RG_KillReq:overrides}}:{h:{MapDetails:details}}}}});
 assert(Math.abs(expected-meta.required)<Math.max(1e-8,Math.abs(expected)*1e-12),'Map '+meta.id+' clearing requirement');
}
assert.equal(mapCatalog[156].required,460405472.3639257);
const respawnStart=source.indexOf('_event_Respawn:function');
const guardian=source.indexOf('m._customBlock_RoyalG("GuardianRoyalRadius"',respawnStart);
assert(source.slice(respawnStart,guardian).includes('0==this._TempMonster'));
console.log('Every map requirement matches the client; Wurm Highway 460,405,472.36; Guardian marking excludes temporary crystal mobs.');

'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const source=fs.readFileSync(process.env.IDLEON_CLIENT_PATH||'../audit/N.js','utf8');
function extract(marker){
 const at=source.indexOf(marker);assert(at>=0,marker);const start=at+marker.length;
 let depth=0,quote='',escape=false;
 for(let i=start;i<source.length;i++){
  const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}
  if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);
 }throw Error('Unclosed '+marker);
}
const catalog=name=>vm.runInNewContext('('+extract(name+'=')+')()');
const genes=catalog('db.PetGenes'),territories=catalog('na.TerritoryInfo'),upgrades=catalog('na.PetUpgradeINFO'),random=catalog('ja.RANDOlist');
const base=path.resolve('vendor/idleon-toolbox');
const compiled=esbuild.buildSync({stdin:{contents:"import './vendor/idleon-toolbox/polyfills'; export * from './vendor/idleon-toolbox/parsers/world-4/breeding';",resolveDir:__dirname,loader:'ts'},bundle:true,write:false,format:'cjs',platform:'node',define:{'process.env.NODE_ENV':'"production"'},alias:{'@parsers':path.join(base,'parsers'),'@utility':path.join(base,'utility'),'@website-data':path.join(base,'data/website-data/index.js')},logLevel:'silent'}).outputFiles[0].text;
const context={module:{exports:{}},console};vm.createContext(context);vm.runInContext(compiled,context);const parser=context.module.exports;
const b=Array.from({length:26},()=>Array(24).fill(0));b[0]=[1,0,0];b[1]=[1,0,0,0];b[2]=Array(13).fill(0);
const gen=[];gen[10]=0;gen[44]=0;gen[53]=[0,0,0,0];
const attrs={Breeding:b,Pets:Array.from({length:140},()=>['none',0,0,0]),Territory:Array.from({length:28},()=>[0,0]),GemItemsPurchased:Array(150).fill(0),OptionsListAccount:Array(130).fill(0),CustomLists:{h:{PetGenes:genes,PetUpgradeINFO:upgrades,TerritoryInfo:territories}},DNSM:{h:{CalcTalentMAP:{h:{arena:0}}}},PixelHelperActor:Array.from({length:23},()=>({behaviors:{getBehavior:()=>({_GenINFO:gen})}}))};
let vault=0;
const env={Math,c:{asNumber:Number},a:{engine:{getGameAttribute:key=>attrs[key]}},p:{},m:{_customBlock_Summoning:()=>vault,_customBlock_Minehead:()=>0},D:{contains:(a,v)=>a.includes(v)},n:{__cast:x=>x},ib:{}};
env.p._customBlock_Breeding=vm.runInNewContext('('+extract('p._customBlock_Breeding=')+')',env);
env.p._customBlock_PetStuff=vm.runInNewContext('('+extract('p._customBlock_PetStuff=')+')',env);
env.p._customBlock_AchieveStatus=()=>0;
const native=(name,i=0,s=0)=>env.p._customBlock_PetStuff(name,'0',i,s);
function parsed(){const account={upgradeVault:{upgrades:Array.from({length:60},(_,i)=>({bonus:i===56?vault:0}))},gemShopPurchases:attrs.GemItemsPurchased,accountOptions:attrs.OptionsListAccount};return parser.getBreeding({Breeding:JSON.stringify(b),Pets:JSON.stringify(attrs.Pets),PetsStored:'[]',Territory:JSON.stringify(attrs.Territory)},account,{charactersData:[]});}
let comparisons=0;const near=(a,b)=>{assert(Number.isFinite(a)&&Number.isFinite(b));assert(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);comparisons++;};
// All upgrade effects, including the four independent multiplier gates.
for(let id=0;id<13;id++)for(const level of [0,1,5,10]){
 b[2][id]=level;near(parser.calcUpgradeBonus({level},id,{}),env.p._customBlock_Breeding('PetUpgBONUS','0',id,0));b[2][id]=0;
}
for(let id=0;id<13;id++){
 b[2][id]=1;const gates=parsed().unlockedBreedingMulti;
 for(const [key,index] of Object.entries({second:3,third:5,fourth:7,fifth:10}))assert.equal(gates[key],id===index,`${key}: upgrade ${id}`);
 b[2][id]=0;
}
// Boundary checks execute the native SpecialPassives handler. Zero is gated
// before the game calls that handler; absent progress must not invent a shiny.
const models={};vm.createContext(models);vm.runInContext(fs.readFileSync('progression-models.js','utf8'),models);
const arenaModel=new Map([['breeding',{arenaWave:999}]]),Teams=require('./breeding-teams');
for(const wave of [0,...random[53].flatMap(v=>[Number(v)-1,Number(v),Number(v)+1])]){
 attrs.OptionsListAccount[89]=wave;const rewards=models.ProgressionModels.build(arenaModel,{OptionsListAccount:attrs.OptionsListAccount}).petArena;
 const earned=random[53].filter(t=>wave>=Number(t)).length;attrs.DNSM.h.CalcTalentMAP.h.arena=earned;
 assert.equal(rewards.filter(r=>r.status==='maxed').length,earned);
 near(Teams.arenaSlots(wave),env.p._customBlock_Breeding('PetBattleSlots','0',0,0));
}
assert(models.ProgressionModels.build(arenaModel,{}).petArena.every(r=>r.status==='unknown'));
// Egg power must remain valid without any Beast Master in the roster.
attrs.Lv0=Array(12).fill(0);attrs.Lv0[11]=50;env.p._customBlock_getbonus2=()=>1;
const range=parser.getEggsPowerRange([{class:'Warrior',skillsInfo:{breeding:{level:50}},flatTalents:[]}]);
for(let tier=1;tier<=11;tier++){
 env.c.randomFloatBetween=(lo,hi)=>hi;near(range[tier-1].minPower,env.p._customBlock_Breeding('PetQTYonBreed','0',tier,0));
 env.c.randomFloatBetween=(lo,hi)=>lo;near(range[tier-1].maxPower,env.p._customBlock_Breeding('PetQTYonBreed','0',tier,0));
}
for(let level=1;level<20;level++){
 const threshold=Math.floor((1+level**1.6)*1.7**level);
 for(const progress of [threshold-.001,threshold,threshold+.001]){
  b[22][0]=progress;const expected=env.p._customBlock_Breeding('SpecialPassives','Lv',0,0);
  near(parsed().pets[0][0].shinyLevel,expected);near(models.ProgressionModels.shinyLevelFromProgress(progress),expected);
 }
}
b[22][0]=0;assert.equal(parsed().pets[0][0].shinyLevel,0);
b[22]=[];assert.equal(parsed().pets[0][0].shinyLevel,0);assert.equal(models.ProgressionModels.shinyLevelFromProgress(undefined),null);b[22]=Array(24).fill(0);
// Native foraging and fight-power parity across all 26 territories. This covers
// Fastidious/Flashy, repeated genes, row neighbors, empty slots, Vault, and Axe.
for(let trial=0;trial<16;trial++){
 b[2][6]=trial%4===0?0:trial*3;vault=trial*19;
 for(let row=0;row<28;row++)for(let slot=0;slot<4;slot++){
  const gene=[2,3,6,10,13,14,15,16,18,20,26,27,33][(trial*7+row*3+slot)%13];
  attrs.Pets[27+row*4+slot]=trial%5===0&&slot===3?['none',0,0,0]:['mushG',gene,100+row*17+slot*43,0];
 }
 const result=parsed();
 for(let i=0;i<26;i++){
  const power=native('TotalTrekkingFightPOW',i),required=native('TotalTrekkingFightPowREQ',i),speed=native('TotalTrekkingHR',i);
  near(result.territories[i].teamFightPower,power);
  near(result.territories[i].forageSpeed,power<required?0:speed);
  near(result.territories[i].reqProgress,native('TotalTrekkingREQ',i));
 }
}
// Recipe planners must preserve Miasma when considering an Opticular swap.
const slot=(gene,power,key)=>({gene,state:'owned',pet:{gene,power,key}});
const early=[slot('Opticular',100,'o'),slot('Miasma',200,'m'),slot('Forager',100,'f'),slot('Fleeter',100,'l')];
assert.equal(Teams.improveOpticular({inventory:[{gene:'Forager',power:200,key:'f2'}]},early,new Set(['o','m','f','l']))[0].gene,'Opticular');
// Exact game catalogs for abilities and upgrades have not drifted.
const c={window:{}};vm.runInNewContext(fs.readFileSync('world4-data.js','utf8'),c);
assert.equal(JSON.stringify(c.window.WORLD4_CATALOG.PetGenes),JSON.stringify(genes));
assert.equal(JSON.stringify(c.window.WORLD4_CATALOG.PetUpgradeINFO),JSON.stringify(upgrades));
const catalogPets=c.window.WORLD4_CATALOG.PetStats,decodedPets=parsed().pets;
for(let world=0;world<4;world++)for(let index=0;index<catalogPets[world].length;index++){
 const pet=catalogPets[world][index],decoded=decodedPets[world][index],passive=Number(random[90][Number(pet[5])]);
 assert.equal(decoded.monsterRawName,pet[0]);
 assert.equal(decoded.gene.name,genes[Number(random[55][Number(pet[5])-1])][0]);
 assert.equal(decoded.baseValue,Number(random[92][passive]));
}
console.log(`Breeding audit: ${comparisons} native formula comparisons; upgrade gates, shiny boundaries, catalog and Miasma regressions passed.`);

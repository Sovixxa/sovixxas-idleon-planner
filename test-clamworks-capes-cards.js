'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {handler}=require('./client-source-utils'),Clam=require('./clamworks-optimizer');
const c={console,structuredClone,setTimeout};vm.createContext(c);
for(const file of ['prayer-math-engine.js','connected-primary-stats.js','drop-rate-model.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const M=c.PrayerMath,nativeSource=fs.readFileSync('../audit/live-N-nov15-hotfix-check.js','utf8');
const near=(actual,expected)=>assert(Math.abs(actual-expected)<=Math.max(1,Math.abs(expected))*1e-10,`${actual} != ${expected}`);
const map=vm.runInNewContext('('+handler(nativeSource,'IDforCardBonus')+')()',{l:function(){this.h={};}}).h;
assert.equal(map[96],'+{%_Total_Damage_Multi');
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
const parsed=M.parseData(raw.data,raw.charNames,raw.companion,raw.guildData,raw.serverVars,raw.accountCreateTime,raw.tournament);
const ch=structuredClone(parsed.characters[3]);ch.cards.equippedCards=[];
const before=M.getMaxDamage(ch,parsed.characters,parsed.account).maxDamage;
ch.cards.equippedCards=[{effect:map[96],amount:1,bonus:8,stars:6,chipBoost:1,legendBonus:1.75}];
const after=M.getMaxDamage(ch,parsed.characters,parsed.account).maxDamage;
const exponent=parsed.account.hole.reliquarium?4/(5+Number(parsed.account.accountOptions[473]||0)):1;
near(after/before,1.98**exponent);
// The damage-multiplier card must not leak into the pre-softcap Total_Damage pool.
const nativeGallery=handler(nativeSource,'_customBlock_Gallery');
let checks=0;
for(const capes of [[],['EquipmentCape22'],['EquipmentCape22','EquipmentCape20','EquipmentCape18','EquipmentCape4']])
for(const goldUpgrade of [0,2])for(const bundle of [0,1])for(const pet of [0,10,20]){
 const a=JSON.parse(JSON.stringify(parsed.account));
 a.accountOptions[669]=goldUpgrade;
 a.companions.list[105]={...a.companions.list[105],acquired:pet>0,viaToken:false,simulated:false,bonus:pet};
 const spelunk=[];spelunk[54]=capes;
 const result=M.getCapeVine({Spelunk:JSON.stringify(spelunk),BundlesReceived:JSON.stringify({ban_o:bundle})},a);
 const hats=Object.fromEntries(a.hatRack.hatBonuses.map(x=>[x.name,x.value]));
 const attrs={DNSM:{h:{PremHatBonTOT:{h:hats}}},Spelunk:spelunk,ItemDefinitionsGET:{h:Object.fromEntries(Object.entries(M.stampItemCatalog).map(([key,item])=>[key,{h:item}]))}};
 let native;const m={_customBlock_Gallery:(...args)=>native(...args),_customBlock_Stuff2:()=>Math.round(1+goldUpgrade+3*bundle),_customBlock_Companions:()=>pet};
 native=vm.runInNewContext('('+nativeGallery+')',{a:{engine:{getGameAttribute:key=>attrs[key]}},m,c:{asNumber:value=>Number(value)||0},h:{string:String},l:function(){this.h={};}});
 native('InitializeCapeBonuses',0,0);
 assert.deepEqual(Object.keys(result.bonuses).sort(),Object.keys(attrs.DNSM.h.CapeVineBonTOT.h).sort());
 for(const [stat,value]of Object.entries(attrs.DNSM.h.CapeVineBonTOT.h))near(result.bonuses[stat],value);
 const gearChar={equipment:Array(16).fill(null),tools:[],capeVineUnlocked:false};
 gearChar.equipment[12]=M.stampItemCatalog.EquipmentCape22;
 a.capeVine=result;
 near(M.getStatsFromGear(gearChar,104,a).value,500);
 gearChar.capeVineUnlocked=true;
 near(M.getStatsFromGear(gearChar,104,a).value,result.bonuses['%_BIGGER_DAMAGE']||0);
 checks++;
}
console.log(`Clamworks: ${checks} native Capevine comparisons, equipped-cape replacement, and exact +98% post-cap card multiplier passed.`);
// Optional private export regression; the account data is not copied into the repository.
if(process.argv[2]){
 const save=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),snapshot=JSON.stringify(save);
 const result=c.DropRateModel.calculate(save),state=Clam.decode(save),farmer=result.characters[5];
 assert.equal(Clam.farmerMultikill(farmer,state.promotion,state.scurge[2]),943);
 assert.equal(JSON.stringify(save),snapshot);
 console.log(`Reported export: 943% multikill, damage ${farmer.loot.clamworksDamage}; input remains unchanged.`);
}

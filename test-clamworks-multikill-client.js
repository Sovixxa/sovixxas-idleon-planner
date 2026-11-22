'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{handler}=require('./client-source-utils'),M=require('./clamworks-optimizer');
const source=fs.readFileSync('../audit/live-N-nov15-hotfix-check.js','utf8');
const attrs={CurrentMap:306,DNSM:{h:{StarSigns:{h:{}},AlchVials:{h:{}},BoxRewards:{h:{}},AlchBubbles:{h:{}}}},TowerInfo:[],OptionsListAccount:[],AFKtarget:'w7a6',MonsterDefinitionsGET:{h:{w7a6:{h:{}}}}};
const zero=()=>0,p={},x={},ctx={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:v=>Number(v)||0},p,x,k:{_customBlock_StampBonusOfTypeX:zero,_customBlock_GetTalentNumber:zero},v:{_customBlock_EtcBonuses:zero,_customBlock_CardBonusREAL:zero},q:{_customBlock_chipBonuses:zero},m:{_customBlock_Holes:zero,_customBlock_Sailing:zero}};
for(const key of ['SaltLick','AchieveStatus','getbonus2','ArcadeBonus','prayersReal','Breeding','CardSetBonuses'])p['_customBlock_'+key]=zero;
x._customBlock_ArbitraryCode=zero;x._customBlock_GetBuffBonuses=zero;
const native=vm.runInNewContext('('+handler(source,'_customBlock_WorkbenchStuff')+')',ctx);
p._customBlock_WorkbenchStuff=(key,...args)=>key==='OverkillQTY'?0:native(key,...args);
x._customBlock_RunCodeOfTypeXforThingY=vm.runInNewContext('('+handler(source,'_customBlock_RunCodeOfTypeXforThingY')+')',ctx);
let checks=0;
for(const base of [0,19,20,49,50,99,100,149,150,199,200,249,250,2000])for(const perTier of [0,20,50,100,150,200,250,2000])for(const promotion of [0,4])for(const affliction of [0,1,3])for(const offset of [.999999,1,1.000001]){
 const hp=1e16*30**promotion,damage=hp*5**5*offset;
 attrs.MonsterDefinitionsGET.h.w7a6.h.MonsterHPTotal=hp;
 attrs.DNSM.h.StarSigns.h.MultiKill=base;attrs.DNSM.h.AlchVials.h.Overkill=perTier;
 x._customBlock_DamageDealed=()=>damage/100**affliction;
 assert.equal(M.farmerMultikill({loot:{damage,base,perTier:[0,0,0,0,0,0,perTier]}},promotion,affliction),native('MultiKillTOTAL',0,0));checks++;
}
assert.match(handler(source,'_customBlock_DamageDealed'),/306==a.engine.getGameAttribute\("CurrentMap"\).*?Math.pow\(100,c.asNumber\(a.engine.getGameAttribute\("Menagerie"\)\[5\]\[2\]\)\)/s);
console.log(`Clamworks native multikill parity: ${checks} curve, tier, promotion and Self Affliction cases passed.`);

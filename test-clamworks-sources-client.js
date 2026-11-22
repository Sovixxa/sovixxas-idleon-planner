'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),esbuild=require('esbuild'),{handler}=require('./client-source-utils');
// Execute the production source functions with independently supplied leaf bonuses.
// This verifies every source's wiring/coefficient, not the upstream leaf parsers.
const ts=fs.readFileSync('vendor/idleon-toolbox/parsers/damage.ts','utf8');
const functions=ts.slice(ts.indexOf('export const getMultiKillBase'),ts.indexOf('// From World 7 onwards'));
const compiled=esbuild.transformSync(functions.replace(/export /g,'')+'\nglobalThis.calc={getMultiKillBase,getMultiKillPerTier};',{loader:'ts'}).code;
let values={};const val=k=>values[k]||0;
const context={bonuses:{etcBonuses:{29:29,71:71}},getStarSignBonus:(_c,_a,key)=>val(key),getSaltLickBonus:()=>val('salt'),getStampsBonusByStat:()=>val('stamp'),getStatsFromGear:(_c,id)=>({value:val('gear'+id)}),getObolsBonus:(_c,id)=>val('obol'+id),getAchievementStatus:(_a,id)=>val('ach'+id),calcTotalOnyx:()=>val('onyx'),getTalentBonus:()=>val('monolith'),getVialsBonusByStat:()=>val('vial'),getTalentBonusIfActive:(_b,name)=>val(name),getHighestTalentAcrossCharacters:()=>val('master'),getArcadeBonus:()=>({bonus:val('arcade')}),isArtifactAcquired:()=>({bonus:val('artifact')}),getPlayerLabChipBonus:()=>val('chip'),getMeasurementBonus:()=>val('measurement'),getCardBonusByEffect:()=>val('card'),getPrayerBonusAndCurse:()=>({bonus:val('prayer')}),getShinyBonus:()=>val('shiny'),getPostOfficeBonus:()=>val('office'),getActiveBubbleBonus:()=>val('bubble')};
vm.createContext(context);vm.runInContext(compiled,context);
const source=fs.readFileSync('../audit/live-N-nov15-hotfix-check.js','utf8');
const attrs={CurrentMap:306,DNSM:{h:{StarSigns:{h:{}},AlchVials:{h:{}},BoxRewards:{h:{}},AlchBubbles:{h:{}}}},TowerInfo:[],OptionsListAccount:[]};
const p={_customBlock_SaltLick:()=>val('salt'),_customBlock_AchieveStatus:id=>val('ach'+id),_customBlock_getbonus2:()=>val('master'),_customBlock_ArcadeBonus:()=>val('arcade'),_customBlock_prayersReal:()=>val('prayer'),_customBlock_Breeding:()=>val('shiny'),_customBlock_CardSetBonuses:()=>val('cardSet')};
const native=vm.runInNewContext('('+handler(source,'_customBlock_WorkbenchStuff')+')',{a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},p,k:{_customBlock_StampBonusOfTypeX:()=>val('stamp'),_customBlock_GetTalentNumber:()=>val('monolith')},v:{_customBlock_EtcBonuses:id=>val('gear'+id)+val('obol'+id),_customBlock_CardBonusREAL:()=>val('card')},x:{_customBlock_ArbitraryCode:()=>val('onyx'),_customBlock_GetBuffBonuses:id=>val(id===46?'VOID_RADIUS':'MANA_IS_LIFE')},q:{_customBlock_chipBonuses:()=>val('chip')},m:{_customBlock_Holes:()=>val('measurement'),_customBlock_Sailing:()=>val('artifact')}});
p._customBlock_WorkbenchStuff=(key,id,...args)=>key==='OverkillQTY'?val(id===7?'miniNote':'worldNote'):native(key,id,...args);
const diminish=v=>v>=250?98.14+(v-250)/50:v>=200?95.6+(v-200)/20:v>=150?90.6+(v-150)/10:v>=100?80.6+(v-100)/5:v>=50?47.3+(v-50)/1.5:v>=20?20+(v-20)/1.1:v;
const keys=['Total_Multikill','salt','stamp','tower','gear29','obol29','ach148','ach122','ach123','onyx','monolith','worldNote','miniNote','vial','VOID_RADIUS','master','portals','arcade','artifact','MANA_IS_LIFE','chip','gear71','obol71','measurement','card','Multikill_Per_Tier','prayer','shiny','office','bubble','cardSet'];
const all=Object.fromEntries(keys.map((key,i)=>[key,(i+1)*7.3]));
const cases=[{},all,...keys.map(key=>({...{onyx:3,monolith:2,master:4,portals:35},[key]:all[key]}))];
for(values of cases){
 attrs.TowerInfo[2]=val('tower');attrs.OptionsListAccount[158]=val('portals');
 attrs.DNSM.h.StarSigns.h={MultiKill:val('Total_Multikill'),78:val('Multikill_Per_Tier')};attrs.DNSM.h.AlchVials.h.Overkill=val('vial');attrs.DNSM.h.BoxRewards.h['13b']=val('office');attrs.DNSM.h.AlchBubbles.h.MKtierACTIVE=val('bubble');
 const character={classIndex:4,activeBuffs:[{name:'VOID_TRIAL_RERUN'}],mapIndex:306,cards:{cardSet:{rawName:'CardSet9',bonus:val('cardSet')}}};
 const account={towers:{towersTwo:val('tower')},deathNote:{6:{rank:val('worldNote')},miniBosses:{rank:val('miniNote')}},accountOptions:attrs.OptionsListAccount};
 const base=context.calc.getMultiKillBase(character,[],account),tier=context.calc.getMultiKillPerTier(character,[],account,6);
 assert(Math.abs(diminish(base)-native('MultiKill_base',0,0))<1e-9);
 assert(Math.abs(tier-native('MultiKill_perTier',0,8675309))<1e-9);
}
console.log(`Clamworks source wiring: ${keys.length} direct inputs across ${cases.length} native base/per-tier comparisons passed.`);

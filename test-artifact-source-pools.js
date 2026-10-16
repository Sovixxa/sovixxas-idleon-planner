'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),esbuild=require('esbuild');
const {handler}=require('./client-source-utils');
const source=esbuild.transformSync('const f='+handler(fs.readFileSync('../audit/N.js','utf8'),'_customBlock_Sailing'),{minify:false}).code;
let expr=source.split('\n').find(l=>l.includes('"BoatArtiMulti" == e')).split(' return ')[1].replace(/;$/, '');
// Substitute source values only. The native addition/multiplication structure remains intact.
const terms=[
 'm._customBlock_Sailing("ArtifactBonus", 3, 0)',
 'm._customBlock_CaptBonusCalc(3, c.asNumber(a.engine.getGameAttribute("Boats")[0 | t][0]))',
 '25 * Math.min(30, c.asNumber(a.engine.getGameAttribute("NONdummies")[60]))',
 'p._customBlock_Breeding("ShinyBonusS", "Nah", 21, -1)',
 '20 * m._customBlock_RandomEvent("FractalIslandBonus", 3, 999)',
 'q._customBlock_GetBribeBonus("34")',
 'p._customBlock_ArcadeBonus(32)', 'p._customBlock_ArcadeBonus(66)',
 'm._customBlock_Holes("B_UPG", 55, 0)',
 'm._customBlock_FarmingStuffs("StickerBonus", 2, 99)',
 'm._customBlock_ResearchStuff("Grid_Bonus", 109, 0)',
 'm._customBlock_Summoning("VaultUpgBonus", 63, 0)',
 '(1 + c.asNumber(a.engine.getGameAttribute("DNSM").h.StarSigns.h[61]) / 100)',
 'Math.max(1, Math.min(2, 1 + 2 * m._customBlock_Companions(154)) + m._customBlock_CompLV2(154))',
 'Math.max(1, m._customBlock_RandomEvent("KillroyBonuses", 0, 0))',
 '(1 + m._customBlock_ResearchStuff("Grid_Bonus", 106, 0) / 100)',
 '(1 + c.asNumber(a.engine.getGameAttribute("DNSM").h.AlchVials.h["6turtle"]) / 100)',
 'Math.max(1, Math.pow(1.5, m._customBlock_Stuff2("PurpleChestSlugsOwned", 0, 0)))',
 '(1 + m._customBlock_Summoning("WinBonus", 3, 0) / 100)',
 null,null,null,
 '(1 + p._customBlock_MainframeBonus(14) / 100)',
 '(1 + m._customBlock_Thingies("LoreEpiBon", 3, 0) / 100)',
 '(1 + m._customBlock_Ninja("PristineBon", 2, 0) / 100)',
 '(1 + m._customBlock_Summoning("VotingBonusz", 20, 0) / 100)',
 '(1 + m._customBlock_Companions(43))',
 '(1 + m._customBlock_Holes("MonumentROGbonuses", 1, 2) / 100)',
 '(1 + m._customBlock_FarmingStuffs("ExoticBonusQTY", 45, 0) / 100)',
 '(1 + m._customBlock_GamingStatType("PaletteBonus", 5, 0) / 100)',
 'Math.max(1, Math.pow(1.02, a.engine.getGameAttribute("Spelunk")[6].length) * m._customBlock_GamingStatType("SuperBitType", 26, 0))',
 '(1 + m._customBlock_SushiStuff("RoG_BonusQTY", 7, 0) / 100)',
 '(1 + q._customBlock_JellyOperation("RoG_BonusQTY", 19, 0) / 100)',
 '(1 + m._customBlock_Minehead("Button_Bonuses", 3, 0) / 100)',
 'q._customBlock_MenagerieStuff("NightmarinerBon", 0, 0)',
 'Math.max(1, m._customBlock_Companions(56) / 5)',
 '(1 + m._customBlock_FarmingStuffs("StickerBonus", 2, 100) / 100)'
];
function replace(text,old,next){assert(text.includes(old),'Native source changed: '+old);return text.replace(old,next);}
terms.forEach((term,i)=>{if(term)expr=replace(expr,term,`v[${i}]`);});
let davey=source.split('\n').find(l=>l.includes('"DaveyJonesBonus" == e')).split(' return ')[1].replace(/;$/, '');
davey=replace(davey,'50 * c.asNumber(a.engine.getGameAttribute("GemItemsPurchased")[8])','v[19]');
davey=replace(davey,'m._customBlock_Thingies("LegendPTS_bonus", 11, 0)','v[20]');
const factor=davey.slice(davey.indexOf(' * ')+3);davey=replace(davey,factor,'v[21]');
expr=replace(expr,'m._customBlock_Sailing("DaveyJonesBonus", t, 0)',`(${davey})`);
const native=vm.runInNewContext('(v)=>'+expr),rows=require('./sailing-artifact-chance').rows;
const fresh=()=>rows.map((r,i)=>i<12||i===19||i===20?0:1);
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(let i=0;i<37;i++){
 const v=fresh();v[0]=100;v[19]=100;
 const before=native(v),pooled=i<12||i===19||i===20;
 assert.equal(rows[i].group,i<12?'Additive':i===19||i===20?'Davey Jones pool':'Multiplier');
 v[i]+=pooled?100:1;
 near(native(v)/before,pooled?1.5:2);
}
console.log('Native artifact formula: all 37 UI sources verified against additive, Davey Jones, and independent multiplier placement.');

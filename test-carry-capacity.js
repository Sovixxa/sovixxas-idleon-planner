'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const box={console,structuredClone};vm.createContext(box);box.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),box));let response;box.postMessage=r=>response=r;vm.runInContext(fs.readFileSync('carry-capacity-worker.js','utf8'),box);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));box.onmessage({data:structuredClone(raw)});assert(!response.error,response.error);assert(response.result.players.length>0);assert.equal(response.result.players[0].rows.length,8);assert(response.result.players[0].audit.some(r=>r.name==='Extra Bags'&&r.scope==='Materials'));
const E=box.PrayerMath,data=typeof raw.data==='string'?JSON.parse(raw.data):structuredClone(raw.data||raw),parsed=E.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament),{account,characters}=parsed;
// Execute the installed client's original function against resolved source values.
const source=fs.readFileSync('../audit/carry-cap-client.txt','utf8');const fn=source.slice(source.indexOf('function'),source.lastIndexOf(',x'));
const types=['bCraft','bOre','bBar','cOil','bLog','bLeaf','dFish','dBugs','cFood','dCritters','dSouls','dCurrency','dStatueStone','dQuest'];
for(const character of characters){for(const type of types){
 const calc=E.getItemCapacity(type,character,account,false),lookup=name=>calc.breakdown.filter(r=>r.name===name).map(r=>r.value),v=name=>lookup(name)[0]||0;
 const attrs={MaxCarryCap:{h:character.maxCarryCap},BundlesReceived:{h:{bon_w:v('Bundle Capacity')/1000,bon_x:0,bon_y:0}},GemItemsPurchased:Array(59).fill(0),DNSM:{h:{StarSigns:{h:{CarryCap:v('Star Sign')}}}}};attrs.GemItemsPurchased[58]=v('Gemshop');
 const ctx={Math,a:{engine:{getGameAttribute:name=>attrs[name]}},c:{asNumber:n=>Number(n)||0},p:{_customBlock_GuildBonuses:()=>v('Guild'),_customBlock_Shrine:()=>v('Shrine'),_customBlock_prayersReal:i=>i===4?-v('Zerg Rushogen penalty'):v('Ruck Sack prayer')},m:{_customBlock_Companions:()=>v('Companion'),_customBlock_CompLV2:()=>v('Companion Lv2')/30,_customBlock_Summoning:()=>v('Upgrade Vault')},q:{_customBlock_GetBribeBonus:()=>v('Bribe')},k:{_customBlock_GetTalentNumber:(_,id)=>id===634?v('Talent'):(lookup('Talent')[1]||0),_customBlock_StampBonusOfTypeX:id=>id==='AllCarryCap'?v('All Stamps'):v('Stamps')},x:{}};
 vm.createContext(ctx);ctx.x._customBlock_MaxCapacity=vm.runInContext('('+fn+')',ctx);assert.equal(calc.value,ctx.x._customBlock_MaxCapacity(type),character.name+' '+type);
}}
// Nanochip: inventory ownership does not count, equipped does, Infinite Stars gates it on Cosmos.
const c={playerId:0,starSigns:[{starName:'Pack_Mule',bonuses:[{effect:'Carry_Cap',bonus:10}]}],skillsInfo:{summoning:{level:0}}};
const a={starSigns:[{starName:'Pack_Mule',unlocked:true,bonuses:[{effect:'Carry_Cap',bonus:10}]}],lab:{playersChips:[[]],chips:[{name:'Silkrode_Nanochip',index:15,baseVal:1}]}};
assert.equal(E.getStarSignBonus(c,a,'Carry_Cap'),10);a.lab.playersChips[0]=[{index:15,baseVal:1}];assert.equal(E.getStarSignBonus(c,a,'Carry_Cap'),20);a.rift={currentRift:0,list:[{riftBonus:'Infinite_Stars'}]};assert.equal(E.getStarSignBonus(c,a,'Carry_Cap'),10);a.starSigns.push({starName:'Seraph_Cosmos',unlocked:true,bonuses:[]});assert.equal(E.getStarSignBonus(c,a,'Carry_Cap'),22);c.starSigns=[];assert.equal(E.getStarSignBonus(c,a,'Carry_Cap'),22);a.starSigns[0].unlocked=false;assert.equal(E.getStarSignBonus(c,a,'Carry_Cap'),0);
// No-prayer Superbits stack to 60% without adding curses; unlevelled prayers give nothing.
const prayer={name:'Ruck_Sack',prayerIndex:12,level:11,x1:30,x2:20};
const prayerAccount={prayers:[prayer],gaming:{superbitsUpgrades:['No_more_Praying','Prayers_Begone','Prayers_Aint_Meta'].map(name=>({name,unlocked:true}))}};
assert.equal(E.getPrayerBonusAndCurse([], 'Ruck_Sack',prayerAccount).bonus,36);
assert.equal(E.getPrayerBonusAndCurse([], 'Ruck_Sack',prayerAccount).curse,0);
assert.equal(E.getPrayerBonusAndCurse([prayer], 'Ruck_Sack',prayerAccount).bonus,60);
prayer.level=0;assert.equal(E.getPrayerBonusAndCurse([], 'Ruck_Sack',prayerAccount).bonus,0);
// Cosmos cap and Meritocracy are independent multiplicative terms.
a.starSigns[0].unlocked=true;c.skillsInfo.summoning.level=500;
a.tesseract={upgrades:Array.from({length:41},()=>({bonus:0}))};a.tesseract.upgrades[40].bonus=10;
a.voteBallot={meritocracyBonuses:Array.from({length:23},()=>({selected:false,bonus:0}))};a.voteBallot.meritocracyBonuses[22]={selected:true,bonus:20};
assert.equal(E.getStarSignBonus(c,a,'Carry_Cap'),120);
const maxChar=JSON.parse(JSON.stringify(characters[0]));maxChar.maxCarryCap.bCraft=1e20;assert.equal(E.getItemCapacity('bCraft',maxChar,account).value,2050000000);
const local=JSON.parse(JSON.stringify(account));local.sailing.artifacts=[];local.shrines[3]={...local.shrines[3],mapId:50,worldTour:false};assert(E.getItemCapacity('cFood',{...characters[0],mapIndex:50},local).value>E.getItemCapacity('cFood',{...characters[0],mapIndex:0},local).value);
box.onmessage({data:{data:{}}});assert(response.error);
console.log('Carry audit passed: all characters/types match client formula; chip ownership/equipment, Infinite Stars/Cosmos, shrine location, hard cap, missing save.');

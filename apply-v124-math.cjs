'use strict';
const fs=require('fs');
function replace(file,old,next){let s=fs.readFileSync(file,'utf8');if(s.includes(next))return;if(!s.includes(old))throw Error('Missing replacement in '+file);fs.writeFileSync(file,s.replace(old,next));}
replace('engine.js','upgradeQty(state,33)*runtimeLevels.reduce((a,b)=>a+b,0))/100','upgradeQty(state,33)*runtimeLevels.reduce((a,b)=>a+b,0)+11)/100');
replace('bubba-optimizer.js','const outside={vault:',"const outside={event:String(options[311]||'').includes('職')?3:1,eventCost:String(options[311]||'').includes('職')?.5:1,vault:");
replace('bubba-optimizer.js','*s.outside.fountain*s.productionScale','*s.outside.fountain*(s.outside.event||1)*s.productionScale');
replace('bubba-optimizer.js','s.outside.minehead*s.costScale','s.outside.minehead*(s.outside.eventCost||1)*s.costScale');
replace('test-bubba-client.js','const raw={Bubba:b,OptionsListAccount:[]};',"const raw={Bubba:b,OptionsListAccount:[]};raw.OptionsListAccount[311]=trial%2?'職':'';");
replace('test-bubba-client.js','_customBlock_Summoning:()=>0',"_customBlock_Summoning:(name,id)=>name==='EventShopOwned'&&id===58?trial%2:0");
replace('test-bubba-client.js','env={Math,m,q:','env={Math,m,p:{_customBlock_Breeding:()=>0},q:');
replace('test-bubba-client.js','q:{_customBlock_JellyOperation:()=>0}','q:{_customBlock_JellyOperation:()=>0,_customBlock_MenagerieStuff:()=>1}');
replace('test-bubba-optimizer.js','{vault:16,sushi:2,jelly:2.5,fountain:1.5,minehead:.5}','{event:1,eventCost:1,vault:16,sushi:2,jelly:2.5,fountain:1.5,minehead:.5}');
replace('test-event-shop-style-browser.cjs',".count(),56)",".count(),68)");
replace('test-event-shop-style-browser.cjs','56 game icons','68 game icons');
replace('test-bonus-systems.js','eventShop:56','eventShop:68');
replace('sushi-model.js','return {catalog,context,doublers,',"return {catalog,context,doublers,eventFuelCap:eventOwned.includes('答')?10:1,");
replace('menagerie.js','nightBonuses:nightLevels==null?null:[','nightBonuses:unlocks[13].owned==null?null:!unlocks[13].owned?[1,1]:nightLevels==null?null:[');
replace('menagerie.js',"  if(tab==='Jellyfish')content=", "  if(tab==='Boosts'&&analysis?.omnijade)content+=`<div class=\"mena-analysis\"><h3>Omnijade</h3><p>${fmt(analysis.omnijade.total)} total · ${fmt(analysis.omnijade.assigned)} assigned · +${fmt(analysis.omnijade.dailyLevels)} levels per assigned upgrade each day, without increasing purchase costs.</p><p>Pipsqueak adds ${fmt(analysis.omnijade.pipsqueak)} Omnijade.</p></div>`;\n  if(tab==='Jellyfish')content=");

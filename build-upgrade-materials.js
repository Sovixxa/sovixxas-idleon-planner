const fs=require('fs'),vm=require('vm');
const items=require('./vendor/idleon-toolbox/data/website-data/items.json');
const groups={bLog:'Logs',bOre:'Ores',bBar:'Bars',dFish:'Fish',dBugs:'Bugs',dCritters:'Critters',dSouls:'Souls',bLeaf:'Leaves',dStone:'Upgrade stones',dStatueStone:'Statues',cFood:'Food',dQuest:'Quest items'};
function category(id,item={}){
 if(/^Liquid/.test(id))return 'Liquids';
 if(/^CraftMat/.test(id))return 'Anvil materials';
 if(/^Refinery/.test(id))return 'Refinery salts';
 if(/^Spice/.test(id))return 'Spices';
 if(/^SailTr/.test(id))return 'Sailing treasures';
 if(id==='Bits')return 'Gaming bits';
 if(/^W6item/.test(id))return 'World 6 currencies';
 if(/^W7item/.test(id))return 'World 7 currencies';
 if(/^Spelunking/.test(id))return 'Spelunking resources';
 if(id==='Ladle')return 'Cooking ladles';
 if(/^FoodG/.test(id))return 'Golden food';
 if(item.itemType==='Equip')return 'Equipment';
 return groups[item.typeGen]||(item.typeGen==='bCraft'?'Monster drops':'Other materials');
}
const c={window:{}};vm.runInNewContext(fs.readFileSync('alchemy-data.js','utf8'),c);
const stamps=require('./vendor/idleon-toolbox/data/website-data/stamps.json');
const ids=[...new Set([...c.window.ALCHEMY_CATALOG.flatMap(g=>g.bubbles.flatMap(b=>(b.itemReq||[]).map(r=>r.rawName))),...Object.values(stamps).flatMap(g=>Object.values(g).flatMap(s=>s.itemReq.map(r=>r.rawName)))])].sort();
const map=Object.fromEntries(ids.map(id=>[id,category(id,items[id])]));
fs.writeFileSync('upgrade-materials.js',`// Generated from the checked-in item and upgrade catalogs by build-upgrade-materials.js.\n(function(root){\n'use strict';\nconst categories=${JSON.stringify(map,null,2)};\nconst category=id=>categories[id]||'Other materials';\nconst bubble=r=>[...new Set((r.itemReq||[]).map(item=>category(item.rawName)))];\nconst stamp=r=>[category(r.itemId)];\nconst options=(rows,get)=>[...new Set(rows.flatMap(get))].sort((a,b)=>a.localeCompare(b));\nroot.UpgradeMaterials={category,bubble,stamp,options};\n})(globalThis);\n`);
console.log('Classified',ids.length,'upgrade resources:',[...new Set(Object.values(map))].sort().join(', '));

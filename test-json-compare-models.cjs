'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const b={console:{log(){},warn(){},error(){},debug(){}},structuredClone};b.self=b;vm.createContext(b);b.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),b));let result;b.postMessage=x=>result=structuredClone(x);vm.runInContext(fs.readFileSync('bonus-worker.js','utf8'),b);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),snapshot=JSON.stringify(raw);b.onmessage({data:raw});assert(!result.error,result.error);
const groups=result.groups,models=b.BonusSystems.systems(raw),fresh=b.JsonCompareModels.build(models,raw),keys=Object.keys(fresh);assert.equal(keys.length,43);
for(const key of keys){assert(fresh[key].length>0,key+' has real-save coverage');assert.equal(new Set(fresh[key].map(r=>r.id)).size,fresh[key].length,key+' has stable unique keys');assert(fresh[key].every(r=>r.name&&!/undefined|NaN/.test(r.level)),key);assert.equal(JSON.stringify(fresh[key]),JSON.stringify(groups[key]),key+' worker parity');}
assert.equal(JSON.stringify(raw),snapshot,'Does not mutate saves');assert(Object.values(b.JsonCompareModels.build(models,{})).every(rows=>!rows.length),'Missing systems remain unavailable');
const old=models.get('stamps')[0][0].level;models.get('stamps')[0][0].level=old+1;const changed=b.JsonCompareModels.build(models,raw);assert.equal(changed.cmp_stamps[0].value,old+1);models.get('stamps')[0][0].level=old;
const incomplete=structuredClone(raw),d=incomplete.data||incomplete;delete d.POu_0;const partial=b.JsonCompareModels.build(models,incomplete);assert(partial.cmp_postOffice.filter(r=>r.id.startsWith('0:')).every(r=>r.value===null));
fs.writeFileSync('../audit/json-compare-real-groups.json',JSON.stringify(groups));console.log('43 categories: real save coverage, worker parity, unique keys, immutability, numeric changes and missing data passed');

const spelunkSave=structuredClone(raw),spelunkData=spelunkSave.data||spelunkSave;let spelunk=typeof spelunkData.Spelunk==='string'?JSON.parse(spelunkData.Spelunk):spelunkData.Spelunk;spelunk[1][0]=123;spelunk[44][0]=9;spelunk[47][0]=45;spelunkData.Spelunk=spelunk;const tunnelRows=b.JsonCompareModels.build(models,spelunkSave).cmp_spelunking;assert.equal(tunnelRows.find(r=>r.id==='regular:0').value,123);assert.equal(tunnelRows.find(r=>r.id==='grand:0').value,9);assert.equal(tunnelRows.find(r=>r.id==='manic:0').value,45);console.log('Regular, manic and grand discovery save slots stay separate');

const sp=groups.cmp_spelunking;assert.equal(sp.filter(r=>r.section==='grand').length,10);assert.equal(sp.filter(r=>r.section==='depths').length,20);assert.equal(sp.filter(r=>r.section==='lore').length,23);for(const row of sp)assert(fs.existsSync(row.icon),row.icon);assert(sp.filter(r=>r.section==='depths').every(r=>/CaveDoor/.test(r.icon)));assert(sp.filter(r=>r.section==='lore').every(r=>/Spelunking/.test(r.icon)));console.log('All 10 tunnels, 23 lore bonuses and every Spelunking icon verified');

for(const [key,rows] of Object.entries(fresh))for(const row of rows){if(row.icon)assert(fs.existsSync(row.icon),key+': '+row.icon);assert(!['Bubble','Salt 9'].includes(row.name),key+' placeholder entry');}
assert(fresh.cmp_construction.every(r=>/ConTower\d+\.png$/.test(r.icon)));
assert.equal(fresh.cmp_refinery.at(-1).name,'Anionic Salt');
console.log('All comparison row icons exist; construction artwork and placeholder labels checked');

const obol=models.get('obols').familyObols[0].item,stat=obol.itemStats.find(s=>s.stoneName==='UQ1val'),savedStone=stat.stone;stat.stone+=1;const rerolled=b.JsonCompareModels.build(models,raw).cmp_obols[0];assert.notEqual(rerolled.effect,fresh.cmp_obols[0].effect);assert(!rerolled.effect.includes('Misc:'));assert(rerolled.effect.includes('All Stats'));assert(rerolled.effect.includes('Weapon Power: 1'));stat.stone=savedStone;console.log('Obol reroll deltas, named bonuses and weapon power checked');

const partialGallery=structuredClone(raw),pg=partialGallery.data||partialGallery;
let gallerySave=typeof pg.Spelunk==='string'?JSON.parse(pg.Spelunk):pg.Spelunk;
const savedGrades=gallerySave[17];gallerySave[17]=null;pg.Spelunk=gallerySave;
let galleryRows=b.JsonCompareModels.build(models,partialGallery).cmp_gallery;
assert(galleryRows.length>0&&galleryRows.every(r=>r.id.startsWith('trophy:')));
gallerySave[16]=null;gallerySave[17]=savedGrades;
galleryRows=b.JsonCompareModels.build(models,partialGallery).cmp_gallery;
assert(galleryRows.length>0&&galleryRows.every(r=>r.id.startsWith('tag:')));
const partialObols=structuredClone(raw),po=partialObols.data||partialObols;
delete po.ObolEqMAPz1;assert(b.JsonCompareModels.build(models,partialObols).cmp_obols.some(r=>r.id.startsWith('family:')));
delete po.ObolEqO1;assert(!b.JsonCompareModels.build(models,partialObols).cmp_obols.some(r=>r.id.startsWith('family:')));
assert(fresh.cmp_deathNote.every(r=>r.effect.includes('skull points')));
console.log('Partial Gallery records, equipped Obol board detection and skull labels checked');

const expansion=structuredClone(raw),ed=expansion.data||expansion;ed.Research=typeof ed.Research==='string'?JSON.parse(ed.Research):ed.Research;
ed.Research[8][0]+=3;ed.Research[17][0]+=1;
const expansionRows=b.JsonCompareModels.build(models,expansion);
assert.equal(expansionRows.cmp_minehead.find(r=>r.id==='upgrade:0').value,fresh.cmp_minehead.find(r=>r.id==='upgrade:0').value+3);
assert.equal(expansionRows.cmp_jelly.find(r=>r.id==='upgrade:0').value,fresh.cmp_jelly.find(r=>r.id==='upgrade:0').value+1);
assert(fresh.cmp_arcade.every(r=>!/who knows|filler/i.test(r.name)));
assert.equal(new Set(fresh.cmp_sneaking.map(r=>r.section)).size,7);
assert(fresh.cmp_bags.some(r=>r.value===1)&&fresh.cmp_bags.some(r=>r.value===0));
console.log('Minehead/Jelly mutations, all seven Sneaking sections, bag ownership and Arcade placeholders checked');

const skillFixture={charNames:['Tester'],data:{Lv0_0:JSON.stringify([100,12,0])}};
const skillRows=b.JsonCompareModels.build(models,skillFixture).cmp_skills;
assert.equal(skillRows.length,20);assert.equal(skillRows[0].name,'Tester \u00b7 Mining');assert.equal(skillRows[0].value,12);assert.equal(skillRows[1].value,0);assert.equal(skillRows[2].value,null);assert.equal(skillRows[19].name,'Tester \u00b7 Research');
console.log('Skill slots, zero levels and unavailable levels checked');

const characterSave=structuredClone(raw),cd=characterSave.data||characterSave;
const read=k=>typeof cd[k]==='string'?JSON.parse(cd[k]):cd[k];
const write=(k,v)=>{cd[k]=typeof cd[k]==='string'?JSON.stringify(v):v;};
const gear=read('EquipOrder_0');gear[0][1]='EquipmentBows1';cd.EquipOrder_0=gear;
const stones=read('EMm0_0');stones[0].AGI+=7;write('EMm0_0',stones);
const inventoryQty=read('ItemQTY_0');inventoryQty[0]+=9;cd.ItemQTY_0=inventoryQty;
const cap=read('MaxCarryCap_0');const capKey=Object.keys(cap).find(k=>!['Quests','Statues','fillerz'].includes(k));cap[capKey]+=10;write('MaxCarryCap_0',cap);
cd.PVtStarSign_0='1,';const cards=read('CardEquip_0');cards[0]='B';cd.CardEquip_0=cards;
const prayers=read('Prayers_0');prayers[0]=-1;cd.Prayers_0=prayers;
const lab=read('Lab');lab[1][0]=-1;write('Lab',lab);
const levels=read('Lv0_0');levels[0]+=2;cd.Lv0_0=levels;
const quests=read('QuestComplete_0');quests.TP_Pete1=0;write('QuestComplete_0',quests);
const gates=read('KLA_0');gates[1][0]=7;write('KLA_0',gates);
const cm=b.BonusSystems.systems(characterSave),cg=b.JsonCompareModels.build(cm,characterSave);
const find=(g,k,id)=>g[k].find(r=>r.id===id);
assert.equal(find(cg,'cmp_equipment','0:0:1').level,'Wooden Bow');
assert(find(cg,'cmp_equipment','0:0:0').details.includes('AGI: 267'));
assert.equal(cg.cmp_equipment.filter((r,i)=>r.effect!==fresh.cmp_equipment[i].effect||r.level!==fresh.cmp_equipment[i].level).length,2);
assert.equal(find(cg,'cmp_inventory','0:slot:0').value,find(fresh,'cmp_inventory','0:slot:0').value+9);
assert.equal(find(cg,'cmp_inventory','0:MaxCarryCap_0:'+capKey).value,find(fresh,'cmp_inventory','0:MaxCarryCap_0:'+capKey).value+10);
assert.notEqual(find(cg,'cmp_loadouts','0:signs').level,find(fresh,'cmp_loadouts','0:signs').level);
for(const id of ['0:card:0','0:prayer:0','0:chip:0'])assert.equal(find(cg,'cmp_loadouts',id).level,'Empty');
assert.equal(find(cg,'cmp_progress','0:level').value,find(fresh,'cmp_progress','0:level').value+2);
assert.equal(find(cg,'cmp_progress','0:quest:TP_Pete1').level,'In progress');
assert.equal(find(cg,'cmp_progress','0:portal:1:0').level,'7 kills left');
const incompleteCharacter=structuredClone(characterSave),ic=incompleteCharacter.data||incompleteCharacter;delete ic.EquipOrder_0;delete ic.CardEquip_0;delete ic.QuestComplete_0;delete ic.KLA_0;
const missing=b.JsonCompareModels.build(cm,incompleteCharacter);
assert(!missing.cmp_equipment.some(r=>r.characterId==='0'));
assert(!missing.cmp_loadouts.some(r=>r.id.startsWith('0:card:')));
assert(!missing.cmp_progress.some(r=>r.id.startsWith('0:quest:')||r.id.startsWith('0:portal:')));
fs.writeFileSync('../audit/json-compare-character-changed.json',JSON.stringify(cg));
console.log('Character gear, upgrades, loadouts, inventory, capacity, quests, portals and partial saves passed');



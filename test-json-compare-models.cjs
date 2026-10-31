'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const b={console:{log(){},warn(){},error(){}},structuredClone};b.self=b;vm.createContext(b);b.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),b));let result;b.postMessage=x=>result=structuredClone(x);vm.runInContext(fs.readFileSync('bonus-worker.js','utf8'),b);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),snapshot=JSON.stringify(raw);b.onmessage({data:raw});assert(!result.error,result.error);
const groups=result.groups,models=b.BonusSystems.systems(raw),fresh=b.JsonCompareModels.build(models,raw),keys=Object.keys(fresh);assert.equal(keys.length,38);
for(const key of keys){assert(fresh[key].length>0,key+' has real-save coverage');assert.equal(new Set(fresh[key].map(r=>r.id)).size,fresh[key].length,key+' has stable unique keys');assert(fresh[key].every(r=>r.name&&!/undefined|NaN/.test(r.level)),key);assert.equal(JSON.stringify(fresh[key]),JSON.stringify(groups[key]),key+' worker parity');}
assert.equal(JSON.stringify(raw),snapshot,'Does not mutate saves');assert(Object.values(b.JsonCompareModels.build(models,{})).every(rows=>!rows.length),'Missing systems remain unavailable');
const old=models.get('stamps')[0][0].level;models.get('stamps')[0][0].level=old+1;const changed=b.JsonCompareModels.build(models,raw);assert.equal(changed.cmp_stamps[0].value,old+1);models.get('stamps')[0][0].level=old;
const incomplete=structuredClone(raw),d=incomplete.data||incomplete;delete d.POu_0;const partial=b.JsonCompareModels.build(models,incomplete);assert(partial.cmp_postOffice.filter(r=>r.id.startsWith('0:')).every(r=>r.value===null));
fs.writeFileSync('../audit/json-compare-real-groups.json',JSON.stringify(groups));console.log('38 categories: real save coverage, worker parity, unique keys, immutability, numeric changes and missing data passed');

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

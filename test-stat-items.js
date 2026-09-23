'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const catalog=require('./build-stat-items').generate(),find=id=>catalog.rows.find(r=>r.id===id);
const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('stat-items.js','utf8'),c);
assert(find('FoodG13').benefits.drop.some(b=>b.mode==='direct'),'Golden Cake');
assert(find('FoodG15').benefits.drop.some(b=>b.mode==='direct'),'Golden Sugar Cookie');
assert(find('FoodG11').benefits.classExp.some(b=>b.mode==='direct'),'Golden Nigiri');
assert(find('FoodPotYe5').benefits.classExp.some(b=>b.text.includes('90%')),'Quotient EXP potion');
assert(find('FoodG2').benefits.damage.some(b=>b.mode==='direct'),'Golden Kebabs');
assert(find('FoodG4').benefits.damage.some(b=>b.mode==='direct'),'Golden Nomwich');
assert(!find('FoodG14'),'Spelunking EXP food is not Class EXP');
assert(!find('FoodG5'),'Skill EXP food is not Class EXP');
assert(!find('EquipmentTools1').benefits.damage.some(b=>b.text.includes('Weapon Power')),'Tool skill power is not combat weapon power');
assert(find('ObolSilverPop').benefits.drop.some(b=>b.mode==='direct'),'Drop obols');
assert(find('StonePremLUK').benefits.drop.some(b=>b.mode==='conditional'),'Luck upgrade stones');
assert(find('ConsoleChip3').benefits.drop.some(b=>b.text.includes('5.00x')),'Capped drop-rate chip');
assert(find('ConsoleChip16').benefits.drop.some(b=>b.text.includes('Gallery')),'Current trophy chip effect');
assert(!find('ConsoleChip9'),'Crystal spawn is a different stat');
assert.equal(new Set(catalog.rows.map(r=>r.id)).size,catalog.rows.length);
for(const row of catalog.rows){
 if(row.icon)assert(fs.existsSync(row.icon),row.icon);
 for(const benefits of Object.values(row.benefits))for(const b of benefits)assert(!/Card Drop Chance|Skill EXP|Dungeon Drop/.test(b.text),b.text);
}
for(const kind of ['drop','classExp','damage']){
 const state={query:'',category:'all',mode:'all'};
 const all=c.StatItems.filterRows(catalog,kind,state);assert(all.length>100);
 const direct=c.StatItems.filterRows(catalog,kind,{...state,mode:'direct'});assert(direct.length<all.length);
 const food=c.StatItems.filterRows(catalog,kind,{...state,category:'Food & potions'});assert(food.length);assert(food.every(r=>r.category==='Food & potions'));
 const html=c.StatItems.resultHtml(food,kind,state);assert(html.includes('aria-haspopup="dialog"'));assert(html.includes('data-stat-item='));
 assert.equal(c.StatItems.filterRows(catalog,kind,{...state,query:'no-such-item-xyz'}).length,0);
}
const name=c.StatItems.filterRows(catalog,'drop',{mode:'all',category:'all',query:'golden cake'});assert.equal(name.length,1);
console.log('Stat item catalog: full-catalog filters, correct stat families, gold foods, tool power exclusion, stones, chips and assets pass.');

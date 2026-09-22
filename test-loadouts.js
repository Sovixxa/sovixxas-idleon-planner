'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),loadouts=require('./loadouts');
const m=loadouts.model();
assert.equal(m.builds.length,20);
for(const build of m.builds){
 assert.equal(build.sections.Cards.length,8,build.title+' card count');
 assert.equal(build.sections['Card set'].length,1);
 assert(build.sections.Equipment.length===8);
 const equipment=loadouts.grouped(build.sections.Equipment,m.items,'Equipment');
 assert.deepEqual(equipment.slice(0,4).map(item=>item.id),[0,2,4,6].map(index=>build.sections.Equipment[index]),build.title+' armor row');
 assert.equal(equipment[4].id,build.sections.Equipment[1],build.title+' weapon below armor');
 for(const id of Object.values(build.sections).flat()){
  assert(m.items[id]?.name,'Missing name for '+id);
  assert(fs.existsSync('assets/'+id+'.png'),'Missing sprite '+id);
 }
}
const crystal=m.builds.find(b=>b.id==='crystal-dk');
assert.deepEqual(crystal.sections.Chips,['ConsoleChip21','ConsoleChip20','ConsoleChip15','ConsoleChip16','ConsoleChip17','ConsoleChip18','ConsoleChip9']);
assert.deepEqual(crystal.sections.Prayers,['Prayer7']);
assert.deepEqual(m.builds.find(b=>b.id==='active-exp').sections.Prayers,[]);
assert.equal(loadouts.grouped(crystal.sections.Equipment,m.items).find(x=>x.id==='EquipmentRings36').quantity,2);
const fishing=m.builds.find(b=>b.id==='fishing');
assert.equal(fishing.fishingGuide.length,13);
for(const row of fishing.fishingGuide)for(const id of row.items.filter(Boolean)){assert(m.items[id]?.name);assert(fs.existsSync('assets/'+id+'.png'));}
const nodes=new Map();
const stub=()=>({innerHTML:'',value:'',classList:{add(){},remove(){}},querySelectorAll(){return[];},focus(){}});
const host={innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,stub());return nodes.get(selector);},querySelectorAll(){return[];}};
loadouts.render(host);
assert(host.innerHTML.includes('Crystal DK'));
assert(nodes.get('#loadoutSections').innerHTML.includes('Golden Cake'));
assert(!host.innerHTML.includes('loadouts-dk-reference.png'));
nodes.get('#loadoutBuild').onchange({target:{value:'fishing'}});
assert(host.innerHTML.includes('Fishing spots'));
nodes.get('#loadoutSearch').oninput({target:{value:'this-does-not-exist'}});
assert(nodes.get('#loadoutSections').innerHTML.includes('No items match'));
nodes.get('#loadoutBuild').onchange({target:{value:'boss-dps'}});
assert(host.innerHTML.includes('Boss DPS'));
assert(host.innerHTML.includes(loadouts.SHEET_URL));
console.log('Loadouts: 20 full builds, named sprites, reference slots, fishing guide, duplicate slots, selection and search pass');

const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{decode}=require('./world4');const ctx={window:{}};vm.runInNewContext(fs.readFileSync('world4-data.js','utf8'),ctx);const c=ctx.window.WORLD4_CATALOG;
assert.equal(decode('cooking',{Meals:'[[5,0]]'},c)[0].value,5);assert.equal(decode('cooking',{},c)[0].value,null);
assert.equal(decode('rift',{Rift:[39]},c).filter(r=>r.value===1).length,7);assert.equal(decode('rift',{Rift:[40]},c).filter(r=>r.value===1).length,8);assert.equal(decode('rift',{},c)[0].value,null);
const pets=decode('breeding',{Pets:[['mushG',0,100],['Blank',0,0]],PetsStored:JSON.stringify([['frogG',2,200]])},c);assert.equal(pets.length,2);assert.equal(pets[0].name,'Green Mushroom');assert.equal(pets[1].ability,'Forager');assert.equal(pets[1].value,200);
for(let i=0;i<c.MealINFO.length;i++)assert(fs.existsSync('assets/CookingM'+i+'.png'));
console.log('World 4: meal levels and icons, Rift thresholds, pet records and missing saves OK');

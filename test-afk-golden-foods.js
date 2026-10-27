const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),S=require('./afk-save-model');
vm.runInThisContext(fs.readFileSync('prayer-math-engine.js','utf8'));
const M={...PrayerMath,mapNames:{323:PrayerMath.mapNames[323]}},raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
const before=JSON.stringify(raw),base=S.calculate(raw,M);
for(const [skill,ids] of Object.entries({0:['FoodPotYe5','FoodG11','FoodG12','FoodPotRe4'],1:['PeanutG','FoodG5','FoodMining1','FoodEvent1','Pearl2'],3:['FoodChoppin1','FoodEvent2','FoodG5'],4:['FoodG7','FoodFish1','FoodEvent3','Pearl1'],6:['FoodCatch1','FoodEvent4','FoodG5'],7:['FoodTrapping1'],9:['FoodWorship1'],19:['FoodG14','FoodG5']})){
 for(const id of ids){assert(base[0][skill].foodChoices.some(f=>f.id===id),`${skill} missing ${id}`);const prepared=S.prepare(raw,M,{skill:Number(skill),boostFoods:true,sharedFoods:[id],foodQuantities:{[id]:10000}}).data;for(const key of Object.keys(prepared).filter(k=>/^Lv0_\d+$/.test(k))){const n=key.slice(4),slot=Object.values(prepared['EquipOrder_'+n][2]).indexOf(id);assert(slot>=0,`${id} equipped on ${n}`);if(M.stampItemCatalog[id].Type==='GOLDEN_FOOD')assert.equal(prepared['EquipQTY_'+n][2][slot],10000);}}
}
for(const [skill,id,field] of [[1,'PeanutG','efficiency'],[4,'FoodG7','efficiency']]){
 const low=S.calculate(raw,M,{skill,boostFoods:true,sharedFoods:[id],foodQuantities:{[id]:1}}),high=S.calculate(raw,M,{skill,boostFoods:true,sharedFoods:[id],foodQuantities:{[id]:10000}});
 assert(high[0][skill].nodes.some((n,i)=>n[field]>low[0][skill].nodes[i][field]),`${id} stack raises efficiency`);
}
const ham=S.calculate(raw,M,{skill:3,boostFoods:true,sharedFoods:['FoodG5'],foodQuantities:{FoodG5:100000}});
assert(ham[0][3].multiplier!==base[0][3].multiplier,'Golden Ham affects skill EXP');
assert.throws(()=>S.prepare(raw,M,{skill:1,boostFoods:true,sharedFoods:['PeanutG'],foodQuantities:{PeanutG:0}}),/positive whole/);
assert.equal(JSON.stringify(raw),before);
console.log('Food coverage, per-character golden quantities, Mining/Fishing efficiency, skill EXP and save immutability passed.');

const parsed=M.parseData(raw.data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const automatic=S.prepare(raw,M,{skill:1,boostFoods:true,autoFoodStacks:true,sharedFoods:['PeanutG'],foodQuantities:{PeanutG:1}}).data;
for(const ch of parsed.characters){const slot=Object.values(automatic['EquipOrder_'+ch.playerId][2]).indexOf('PeanutG');assert.equal(automatic['EquipQTY_'+ch.playerId][2][slot],M.getItemCapacity('cFood',ch,parsed.account,false).value);}
assert.equal(S.foodSlots({FoodSlO_0:16},0),6);
console.log('Automatic per-character food capacity and six-slot maximum passed.');

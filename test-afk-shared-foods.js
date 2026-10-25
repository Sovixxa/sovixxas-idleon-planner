const assert=require('node:assert/strict'),S=require('./afk-save-model');
const M={stampItemCatalog:{Boost:{Type:'BOOST_FOOD',Effect:'MiningSpeedBoosts'},Other:{Type:'BOOST_FOOD',Effect:'MiningSpeedBoosts'}}};
const raw={data:{Lv0_0:[10],Lv0_1:[10],FoodSlO_0:2,FoodSlO_1:1,EquipOrder_0:[[],[],['Golden','Blank']],EquipQTY_0:[[],[],[100,0]],EquipOrder_1:[[],[],['Other']],EquipQTY_1:[[],[],[10]]}};
const before=JSON.stringify(raw),opts={skill:1,boostFoods:true,sharedFoods:['Boost']};const p=S.prepare(raw,M,opts).data;
assert.deepEqual(p.EquipOrder_0[2].slice(0,2),['Golden','Boost']);assert.equal(p.EquipOrder_1[2][0],'Boost');assert.equal(JSON.stringify(raw),before);
assert.throws(()=>S.prepare(raw,M,{...opts,sharedFoods:['Boost','Other']}),/food slots/);
assert.equal(S.prepare(raw,M,{...opts,boostFoods:false}).data.EquipOrder_1[2][0],'Other');
console.log('Shared boost foods: applied to every character, saved golden food preserved when possible, individual slot limits, reset and immutability passed.');

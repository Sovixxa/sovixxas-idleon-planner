const assert=require('node:assert/strict'),A=require('./afk-tester');
const row={id:0,foodSlots:2,foodChoices:[{id:'BoostA'},{id:'BoostB'},{id:'BoostC'}]},state={rawData:{EquipOrder_0:[[],[],['Golden','BoostA']],EquipQTY_0:[[],[],[100,10]]}};
assert.deepEqual(A.foodSelection(row,state,{foods:{}}),['BoostA']);
assert.deepEqual(A.foodOverrides(row,state,['BoostA','BoostB']),{0:'BoostB'});
assert.deepEqual(A.foodOverrides(row,state,[]),{1:'Blank'});
assert.deepEqual(A.foodOverrides(row,state,['BoostB']),{1:'BoostB'});
assert.throws(()=>A.foodOverrides(row,state,['BoostA','BoostB','BoostC']),/Too many/);
console.log('Boost-food checkbox selection, replacement, removal and slot limits passed.');

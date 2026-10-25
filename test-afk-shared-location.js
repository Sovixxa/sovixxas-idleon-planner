const assert=require('node:assert/strict'),A=require('./afk-tester');
const session={auto:{0:{0:{defaultNode:'a',nodes:[{id:'a',rate:10,map:1},{id:'b',rate:20,map:2}]}},1:{0:{defaultNode:'b',nodes:[{id:'a',rate:30,map:1},{id:'b',rate:40,map:2}]}},2:{0:{nodes:[{id:'a',rate:50,map:1}]}}}};
const plan={rows:[{id:0},{id:1},{id:2}]};A.applyAuto(plan,0,session);assert.equal(plan.node,'a');assert.deepEqual(plan.rows.map(r=>r.rate),['10','30','50']);plan.node='b';A.applyAuto(plan,0,session);assert.deepEqual(plan.rows.map(r=>r.node),['b','b','b']);assert.deepEqual(plan.rows.map(r=>r.rate),['20','40','']);assert.equal(plan.rows[2].map,2);console.log('Shared location: individual rates and unavailable-character handling passed.');
const S=require('./afk-save-model');
const M={mapNames:{1:'Shared_Map'},mapEnemiesArray:{1:'mob'},mapDetails:{1:[[],[10]]},monsters:{mob:{Name:'Mob',AFKtype:'Fighting',ExpGiven:100},ore:{Name:'Ore',AFKtype:'MINING',ExpGiven:5}},getMaxDamage:()=>({killsPerHour:10,afkGains:.5,survivability:100}),getClassExpMulti:()=>({value:2})};
const skiller={playerId:0,mapIndex:1,targetMonster:'ore'},fighter={playerId:1,mapIndex:1,targetMonster:'mob'};
assert.equal(S.combatMaps(skiller,[skiller,fighter],{},M)[0].rate,1000,'A saved mining activity must not hide the combat enemy on the shared map');
assert.equal(S.combatMaps(fighter,[skiller,fighter],{},M)[0].rate,1000);
console.log('Shared combat map correctly replaces a saved gathering activity.');

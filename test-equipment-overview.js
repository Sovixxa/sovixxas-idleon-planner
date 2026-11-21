const assert=require('node:assert/strict');
const {inspect,model}=require('./equipment-overview');
const base={id:'Test',displayName:'Test_Item',Upgrade_Slots_Left:5},stats={STR:3,AGI:0,WIS:0,LUK:0};
assert.equal(inspect(base,{...stats,Upgrade_Slots_Left:1},'STR').slotStatus,'Present');
assert.equal(inspect(base,{...stats,Upgrade_Slots_Left:-5},'STR').slotStatus,'Uncertain');
assert.equal(inspect(base,{...stats,Upgrade_Slots_Left:-5},'STR').remaining,0);
assert.equal(inspect(base,null,'STR').remaining,null);
assert.equal(inspect(base,stats,'STR').alignment,'Matches class');
assert.equal(inspect(base,stats,'AGI').alignment,'Off-class stats');
assert.equal(inspect(base,{...stats,AGI:2},'STR').alignment,'Mixed stats');
assert.equal(inspect(base,{STR:0},'STR').alignment,'Unknown');
assert.equal(inspect(base,stats,'STR').godly,'Unverified');
assert.equal(inspect({Upgrade_Slots_Left:0},{},'STR').slotStatus,'Not applicable');
const data={EquipOrder_3:JSON.stringify([{2:'Test',7:'Blank',length:16},{0:'Test'}]),EMm0_3:JSON.stringify({2:stats}),EMm1_3:JSON.stringify({0:stats}),CharacterClass_3:10};
const rows=model(data,{charNames:['','','','Name']},[base]);assert.equal(rows[0].id,3);assert.equal(rows[0].items.length,2);assert.equal(rows[0].items[0].slot,'Shirt');assert.equal(rows[0].items[1].group,1);assert.equal(rows[0].items[0].alignment,'Matches class');assert.deepEqual(model({}, {}, [base]),[]);
console.log('Equipment model checks passed.');

assert.equal(inspect(undefined,{Upgrade_Slots_Left:1},'STR').slotStatus,'Uncertain');

const modern={modernOnly:true,successfulOnly:true},armorBase={id:'Armor',typeGen:'aPants',Upgrade_Slots_Left:10,UQ1val:1},fields={Upgrade_Slots_Left:-10,Weapon_Power:11,Defence:165,STR:0,AGI:119,WIS:0,LUK:0,UQ1val:0,UQ2val:0};
assert.equal(inspect(armorBase,fields,'AGI',modern).godly,'+9 AGI');
assert.equal(inspect(armorBase,fields,'AGI',modern).godlyMatch,'Matches class');
assert.equal(inspect(armorBase,fields,'WIS',modern).godlyMatch,'Off-class');
assert.equal(inspect(armorBase,fields,null,modern).godlyMatch,'Unknown');
assert.equal(inspect(armorBase,{...fields,AGI:110},'AGI',modern).godly,'Missing');
assert.equal(inspect(armorBase,{...fields,AGI:110,WIS:9},'AGI',modern).godly,'+9 WIS');
assert.equal(inspect(armorBase,{...fields,AGI:111,WIS:9},'AGI',modern).godly,'Unverified','Unexplained totals are not a crafting bonus');
assert.equal(inspect(armorBase,fields,'AGI',{}).godly,'Unverified','Do not infer a Godly roll from one broad-mode witness');
// All valid 1-4 and 7-12 rolls are considered for each stat, including another character applying stones.
for(const stat of ['STR','AGI','WIS','LUK'])for(const bonus of [1,2,3,4,7,8,9,10,11,12]){const data={...fields,AGI:110};data[stat]+=bonus;const result=inspect(armorBase,data,'AGI',modern);assert(result.slotProof.godlyCandidates.some(v=>v[['STR','AGI','WIS','LUK'].indexOf(stat)]===bonus));}

assert.equal(inspect(armorBase,fields,'AGI',modern).godlyRoll,'Can improve');
assert.equal(inspect(armorBase,fields,'AGI',modern).godlyGap,3);
assert.equal(inspect(armorBase,{...fields,AGI:122},'AGI',modern).godlyRoll,'Maxed');
assert.equal(inspect(armorBase,{...fields,AGI:110,WIS:12},'AGI',modern).godlyRoll,'Maxed');
assert.equal(inspect(armorBase,{...fields,AGI:110,WIS:12},'AGI',modern).godlyMatch,'Off-class');
assert.equal(inspect(armorBase,{...fields,AGI:110},'AGI',modern).godlyGap,12);
assert.equal(inspect(armorBase,null,'AGI',modern).godlyRoll,'Unknown');
assert.equal(inspect(armorBase,fields,'AGI',{}).godlyRoll,'Unknown');

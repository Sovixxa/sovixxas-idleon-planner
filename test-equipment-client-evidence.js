// Executes the installed-client stone-effect statements, not the overview solver.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('../audit/N.js','utf8'),items=require('./vendor/idleon-toolbox/data/website-data/items.json');
const middle=source.indexOf('"Main_Stat"==',source.indexOf('_event_InventoryItem:function'));
const start=source.lastIndexOf('for(var _=0',middle),end=source.indexOf('for(e=a.engine.getGameAttribute("ItemMap")',middle);
const slotEnd=source.indexOf('e.h.Upgrade_Slots_Left=i',end)+'e.h.Upgrade_Slots_Left=i'.length;
assert(start>=0&&end>start&&slotEnd>end);
const body='var e,t,i,r,s,u;'+source.slice(start,end)+source.slice(end+4,slotEnd)+';';
function replay(stone,count,extra,godly){
 const fields={Upgrade_Slots_Left:extra,Weapon_Power:0,Speed:0,Reach:0,Power:0,Defence:0,STR:0,AGI:godly,WIS:0,LUK:0,UQ1val:0,UQ2val:0,UQ1txt:0,UQ2txt:0};
 const attrs={ItemMap:[{h:fields}],InventoryOrder:['EquipmentBows14',stone],ItemDefinitionsGET:{h:{EquipmentBows14:{h:items.EquipmentBows14},[stone]:{h:items[stone]}}},DummyList3:items[stone].Effect.split('.'),CharacterClass:22};
 const context={a:{engine:{gameAttributes:{h:attrs},getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},h:{string:String}};
 const run=vm.runInNewContext('(function(){'+body+'})',context);
 for(let n=0;n<count;n++)run.call({_dummynumber:0,_ItemDragID:1});return fields;
}
const noBonus=replay('StoneW8',7,0,0),withBonus=replay('StoneW7',8,1,1);
assert.deepEqual(noBonus,withBonus);assert.equal(noBonus.Upgrade_Slots_Left,-7);assert.equal(noBonus.Weapon_Power,56);assert.equal(noBonus.AGI,49);
console.log('Actual client replay confirms identical full item maps for distinct PO histories.');

// Replay each W6/W7 effect through the actual game statements.
for(const [stone,wp,def,agi,uq] of [['StoneW8',8,0,7,0],['StoneW9',10,0,10,3],['StoneA7',1,15,10,0],['StoneA8',2,20,15,1],['StoneT7',9,0,12,0],['StoneT8',12,0,15,2]]){
 const result=replay(stone,1,0,0);assert.equal(result.Weapon_Power,wp,stone);assert.equal(result.Defence,def,stone);assert.equal(result.AGI,agi,stone);assert.equal(result.UQ1val,uq,stone);assert.equal(result.Upgrade_Slots_Left,-1,stone);
}
console.log('All six W6/W7 stone effects passed the actual-client replay.');

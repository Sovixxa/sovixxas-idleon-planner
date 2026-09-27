(function(root){
'use strict';
const CAPS={StampC4:{limit:50,name:'Arcade ball-rate stamp'},StampC5:{limit:40,name:'Gold Ball cost stamp'},StampC8:{limit:10,name:'Arcade claim-time stamp'}};
const SHARED=new Set(['StampB30','StampB32']);
function inventoryCapacity({slots,perSlot,inventory,itemId,reserved=0}){
 if(!Number.isInteger(slots)||slots<0||!Number.isFinite(perSlot)||perSlot<1||!Array.isArray(inventory))return null;
 perSlot=Math.floor(perSlot);reserved=Math.max(0,Math.min(slots,Math.floor(reserved)||0));
 const occupied=new Map();for(const item of inventory){if(Number.isInteger(item.slot)&&item.slot>=0&&item.slot<slots&&item.amount>0&&item.rawName!=='Blank'&&item.rawName!=='LockedInvSpace')occupied.set(item.slot,item);}
 const matching=[...occupied.values()].filter(i=>i.rawName===itemId),carried=matching.reduce((n,i)=>n+i.amount,0);
 const freeSlots=Math.max(0,slots-occupied.size-reserved),matchingSlots=matching.length;
 return {slots,freeSlots,matchingSlots,carried,perSlot,capacity:freeSlots*perSlot+matching.reduce((n,i)=>n+Math.max(perSlot,i.amount),0),emptyCapacity:Math.max(0,slots-reserved)*perSlot};
}
function model(data,{goal=.95,reserved=0}={}){
 goal=[.9,.95,.99].includes(Number(goal))?Number(goal):.95;
 const rows=data.rows.map(s=>{
 const carriers=(s.carriers||[]).map(c=>({...c,...inventoryCapacity({...c,itemId:s.itemId,reserved})})).filter(c=>Number.isFinite(c.capacity));
 // Prefer a character who can both fit and supply this upgrade, then capacity.
 carriers.sort((a,b)=>Number(b.capacity>=s.materialCost&&b.carried+s.owned>=s.materialCost)-Number(a.capacity>=s.materialCost&&a.carried+s.owned>=s.materialCost)||b.capacity-a.capacity||a.name.localeCompare(b.name));
 let best=carriers[0];const emptyBest=[...carriers].sort((a,b)=>b.emptyCapacity-a.emptyCapacity)[0];
 const coin=s.level<s.maxLevel,cap=CAPS[s.id],shared=SHARED.has(s.id),soft=s.func==='decay'?Math.ceil(s.x2*goal/(1-goal)-1e-9):null;
 const multi=s.effectMultiplier,ceiling=s.func==='decay'&&Number.isFinite(multi)?s.x1*multi:null;
 const capLevel=cap&&Number.isFinite(multi)&&s.x1*multi>cap.limit?Math.ceil(s.x2*cap.limit/(s.x1*multi-cap.limit)-1e-9):null;
 const capped=cap&&Number.isFinite(s.effect)&&s.effect>=cap.limit;
 const target=capped?null:capLevel===null?soft:soft===null?capLevel:Math.min(soft,capLevel);
 let status='Unknown';
 if(!s.known)status='Unknown';else if(s.level===0)status='Not acquired';else if(capped)status='Capped';else if(shared)status='Check shared cap';else if(target!==null&&s.level>=target)status='Soft target met';
 else if(coin)status=Number.isFinite(s.goldCost)?s.goldCost<=data.money?'Upgradeable now':'Need coins':'Unknown';
 else if(Number.isFinite(s.materialCost)&&best){
  if(best.capacity<s.materialCost)status=emptyBest.emptyCapacity>=s.materialCost?'Clear inventory':'Carry blocked';
  else if(s.crafted)status='Crafting required';else status=best.carried+s.owned>=s.materialCost?'Upgradeable now':'Need materials';
 }
 if(status==='Clear inventory')best=emptyBest;
 const slotsNeeded=best&&Number.isFinite(s.materialCost)?Math.max(0,Math.ceil((s.materialCost-(best.capacity-best.freeSlots*best.perSlot))/best.perSlot)):null;
 const priority=/Carry|Refinery|BookSpd|kruk|Cook|Brew|Eff|Atom|DNA|VillageStudy/i.test(s.stat)?2:1;
 return {...s,status,target,softLevel:soft,cap,capLevel,shared,ceiling,best,emptyBest,slotsNeeded,slotsToClear:best&&slotsNeeded!==null?Math.max(0,slotsNeeded-best.freeSlots):null,priority,coin,
  progress:s.func==='decay'?s.level/(s.level+s.x2):null,
  action:coin?'Coin level':'Raise level cap',nextLevel:coin?s.level+1:s.maxLevel+s.interval,
  reason:status==='Capped'?'The named effect is capped; extra levels do not improve it.':status==='Soft target met'?'Diminishing-return checkpoint met; further levels still help.':status==='Check shared cap'?'Check the character’s combined 90% sample rate before spending.':status==='Clear inventory'?'Enough empty-bag capacity exists, but current inventory space is occupied.':status==='Carry blocked'?'The full payment exceeds every character’s empty-bag capacity in the saved W1 setup.':status==='Upgradeable now'?coin?'The next coin level is affordable.':'Fits the current inventory layout after loading materials from storage.':status==='Need materials'?'Storage plus the selected character’s carried stack is short.':status==='Crafting required'?'Craft the required items; each equipment item consumes one inventory slot.':status==='Need coins'?'Save coins for the next level.':status==='Not acquired'?'Obtain and hand in this stamp first.':'Import complete level, inventory and capacity data.'};
 });
 const order={'Upgradeable now':0,'Clear inventory':1,'Need coins':2,'Need materials':3,'Crafting required':4,'Carry blocked':5};
 const todo=rows.filter(s=>s.status in order).sort((a,b)=>order[a.status]-order[b.status]||b.priority-a.priority||(a.progress??1)-(b.progress??1)||(a.coin&&b.coin?a.goldCost-b.goldCost:0)||a.id.localeCompare(b.id));
 return {rows,todo,goal,reserved,money:data.money};
}
const api={model,inventoryCapacity,CAPS};if(typeof module!=='undefined')module.exports=api;else root.StampOptimizer=api;
})(globalThis);

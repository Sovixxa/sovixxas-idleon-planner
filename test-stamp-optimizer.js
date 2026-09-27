const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('./stamp-optimizer-model');
const carrier={name:'A',slots:5,perSlot:10,inventory:[{slot:0,rawName:'Other',amount:4},{slot:1,rawName:'Mat',amount:4}]};
const cap=M.inventoryCapacity({...carrier,itemId:'Mat'});assert.equal(cap.capacity,40);assert.equal(cap.freeSlots,3);assert.equal(cap.carried,4);assert.equal(cap.emptyCapacity,50);
assert.equal(M.inventoryCapacity({...carrier,itemId:'Mat',reserved:2}).capacity,20);
assert.equal(M.inventoryCapacity({...carrier,perSlot:1,itemId:'Gear'}).capacity,3,'Equipment consumes one slot each');
assert.equal(M.inventoryCapacity({...carrier,slots:null,itemId:'Mat'}),null);
const row={id:'StampC8',known:true,name:'Timer',stat:'ArcadeTimeMax',level:100,maxLevel:100,func:'decay',x1:12,x2:30,interval:5,effect:1200/130,effectMultiplier:1,goldCost:10,materialCost:45,owned:100,itemId:'Mat',carriers:[carrier]};
const report=(r,settings)=>M.model({rows:[{...row,...r}],money:100},settings).rows[0];
assert.equal(report({}).status,'Clear inventory');assert.equal(report({}).capLevel,150);assert.equal(report({}).target,150);
assert.equal(report({materialCost:51}).status,'Carry blocked');assert.equal(report({materialCost:40}).status,'Upgradeable now');assert.equal(report({materialCost:40}).slotsNeeded,3,'Top up existing matching stack before allocating new slots');assert.equal(report({materialCost:45}).slotsToClear,1);assert.equal(report({materialCost:40,owned:0}).status,'Need materials');
assert.equal(report({materialCost:40,crafted:true}).status,'Crafting required');assert.equal(report({maxLevel:105,carriers:[]}).status,'Upgradeable now','Coin upgrades need no inventory');
assert.equal(report({level:150,effect:10}).status,'Capped');assert.equal(report({id:'StampC4',x1:50,x2:100,effect:25,level:100}).capLevel,null,'Asymptote is not a finite cap');
assert.equal(report({id:'StampC4',x1:50,x2:100,effect:50,effectMultiplier:2}).status,'Capped');
assert.equal(report({id:'StampC1',x1:70,x2:50,level:1000}).status,'Soft target met');assert.equal(report({id:'StampB30'}).status,'Check shared cap');
assert.equal(report({known:false}).status,'Unknown');assert.equal(report({level:0}).status,'Not acquired');
const stockChoice=report({materialCost:40,owned:0,carriers:[carrier,{name:'B',slots:4,perSlot:10,inventory:[{slot:0,rawName:'Mat',amount:40}]}]});assert.equal(stockChoice.best.name,'B');assert.equal(stockChoice.status,'Upgradeable now');
const c={console:{log(){},warn(){},error(){}},structuredClone};c.self=c;c.window=c;vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));let out;c.postMessage=x=>out=structuredClone(x);c.importScripts('stamp-calculator-worker.js');const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw);c.onmessage({data:raw});assert(!out.error,out.error);assert.equal(JSON.stringify(raw),before);const m=M.model(out.result);assert(m.rows.length>100);assert(m.rows.some(r=>r.status==='Clear inventory'));assert(m.rows.some(r=>r.status==='Upgradeable now'));for(const r of m.rows){if(r.best)assert(r.best.freeSlots<=r.best.slots);if(r.status==='Upgradeable now'&&!r.coin){assert(r.best.capacity>=r.materialCost);assert(r.best.carried+r.owned>=r.materialCost);}}
console.log('Stamp optimizer: effect caps, asymptotes, shared caps, occupied/reserved slots, equipment, stock-aware character choice, coin independence, real save and purity pass.');

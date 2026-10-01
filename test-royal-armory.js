'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={window:{}};box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync('royal-armory-data.js','utf8'),box);global.ROYAL_ARMORY_CATALOG=box.ROYAL_ARMORY_CATALOG;const R=require('./royal-armory.js');
const attachment='C:/Users/Sofia/.codex/attachments/2421dc44-490e-4138-a1b9-f6f2a83a490a/Pasted text.txt',save=JSON.parse(fs.readFileSync(attachment,'utf8')),m=R.model(save),rows=R.bonusRows(save);
assert(m.available);assert.equal(m.upgrades.length,83);assert.equal(m.orblets.length,10);assert.equal(m.statues.length,8);assert.equal(m.resources.length,80);assert(m.outposts.length>20);assert(m.total>0);assert.equal(rows.length,101);assert(rows.some(x=>x.source==='Royal Armory'&&x.status==='active'));assert(rows.every(x=>x.name&&x.effect));
console.log('Royal Armory: upgrades, outposts, resources, statues, Orblet Market, and bonus rows OK');

const fixture={upgrades:Array.from({length:41},(_,id)=>({id,bonus:0})),orblets:[{id:9,bonus:50}]};
let v=R.verminous(fixture);assert.equal(v.damage,10);assert.equal(v.respawn,60);assert.equal(v.chance,.001);
fixture.upgrades[37].bonus=1;fixture.upgrades[38].bonus=50;assert.equal(R.verminous(fixture,100,100).chance,.004);
fixture.upgrades[33].bonus=10000;fixture.upgrades[40].bonus=100;v=R.verminous(fixture);assert.equal(v.respawn,5);assert.equal(v.recycle,75);
fixture.upgrades[35].bonus=null;assert.equal(R.verminous(fixture).damage,null);
console.log('Verminous formulas, unlock gate, caps and missing values passed');

const parchment=R.model(save).upgrades.find(x=>x.id===37);
assert.equal(parchment.contextMissing,false);assert(!parchment.description.includes('—'));assert(parchment.description.includes('Subtotal:'));
const full=R.model(save,{companion:100,jelly:50}),odds=R.verminous(full,100,50).chance;
assert(full.upgrades.find(x=>x.id===37).description.includes((1/odds).toLocaleString(undefined,{maximumFractionDigits:2})));
assert(!full.upgrades.find(x=>x.id===37).description.includes('Subtotal:'));

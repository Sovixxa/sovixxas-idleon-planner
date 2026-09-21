'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={window:{}};box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync('royal-armory-data.js','utf8'),box);global.ROYAL_ARMORY_CATALOG=box.ROYAL_ARMORY_CATALOG;const R=require('./royal-armory.js');
const attachment='C:/Users/Sofia/.codex/attachments/2421dc44-490e-4138-a1b9-f6f2a83a490a/Pasted text.txt',save=JSON.parse(fs.readFileSync(attachment,'utf8')),m=R.model(save),rows=R.bonusRows(save);
assert(m.available);assert.equal(m.upgrades.length,83);assert.equal(m.orblets.length,10);assert.equal(m.statues.length,8);assert.equal(m.resources.length,80);assert(m.outposts.length>20);assert(m.total>0);assert.equal(rows.length,101);assert(rows.some(x=>x.source==='Royal Armory'&&x.status==='active'));assert(rows.every(x=>x.name&&x.effect));
console.log('Royal Armory: upgrades, outposts, resources, statues, Orblet Market, and bonus rows OK');

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),A=require('./account-pages.js');
const box={};box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync('account-data.js','utf8'),box);const catalog=box.ACCOUNT_CATALOG;
let g=A.guild({Guild:[[0],[1,0,0],[0,0,50]]},catalog);
assert.equal(g.tasks[0].name,'W1 Daily Task');assert.equal(g.tasks[0].completed,false);
assert.equal(g.tasks[1].progress,50);assert.equal(g.tasks[1].completed,false);
g=A.guild({Guild:[[0],[0,0,300],[1,1,0]]},catalog);
assert(g.tasks[0].completed);assert(!g.tasks[0].claimed);assert(g.tasks[1].claimed);
const progress=Array.from({length:7},(_,w)=>[1000+w]),tiers=Array.from({length:7},(_,w)=>[w]),merits=Array.from({length:7},(_,w)=>[7-w]);
const m=A.taskModel({TaskZZ0:JSON.stringify(progress),TaskZZ1:JSON.stringify(tiers),TaskZZ2:JSON.stringify(merits)},catalog);
for(let w=0;w<7;w++){assert.equal(m.worlds[w].tasks[0].progress,1000+w);assert.equal(m.worlds[w].tasks[0].level,w);assert.equal(m.worlds[w].shop[0].level,7-w);}
assert.equal(m.worlds[6].tasks.length,4);assert.equal(m.worlds[6].shop.length,5);
assert(m.worlds.every(w=>w.shop.every(x=>!x.name.includes('IDK'))));
assert.equal(A.taskModel({},catalog).worlds[6].tasks[0].level,null);
assert.equal(A.taskModel({},catalog).worlds[6].shop[0].level,null);
assert.equal(A.taskModel({},catalog).achievements[0].complete,null);
console.log('Account pages: Guild IDs/claim/progress, TaskZZ category/world axes, serialized saves, W7 task/merit coverage, unknown states OK');

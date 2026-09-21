const assert=require('assert');
const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('equinox-data.js','utf8'),sandbox={window:{}};vm.runInNewContext(source,sandbox);
global.EQUINOX_CATALOG=sandbox.window.EQUINOX_CATALOG;
const E=require('./equinox.js'),dream=Array(16).fill(0);dream[0]=200;dream[2]=3;dream[5]=2;
const model=E.decode({Dream:dream,WeeklyBoss:{d_0:-1,d_3:-1,d_6:-1}});
assert.equal(model.challenges.length,77);assert.equal(model.upgrades.length,14);assert.equal(model.completed,3);assert.equal(model.cloudsOwned,3);assert.equal(model.unlockedUpgrades,2);assert.equal(model.additive,10);assert.equal(model.upgrades[3].knownMax,7);assert.equal(model.totalLevels,5);assert(Math.abs(model.requirement-320*Math.pow(1.02,5))<1e-8);assert(model.challenges[3].completed);assert.equal(model.challenges[1].target,400);
console.log('Equinox tests passed.');

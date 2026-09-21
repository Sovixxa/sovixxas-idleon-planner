'use strict';const assert=require('node:assert'),fs=require('node:fs'),vm=require('node:vm');const box={window:{}};vm.runInNewContext(fs.readFileSync('remaining-data.js','utf8'),box);global.REMAINING_CATALOG=box.window.REMAINING_CATALOG;const R=require('./remaining-worlds.js');
const statues=R.statues({StatueLevels_0:[[2,15],[3,9]],StatueLevels_1:[[2,15],[3,9]]},{charNames:['A','B']});assert.equal(statues.rows[0].bonus,6);assert.equal(statues.rows[1].level,3);assert.equal(statues.rows.length,32);
const dungeons=R.dungeons({DungUpg:[[4,2],[0],[0],[0],[7,8,9]]});assert.equal(dungeons.passives[0].level,4);assert.equal(dungeons.rank,7);
const prayers=R.prayers({Prayers_0:[0,2,-1]},{charNames:['A']});assert.deepEqual(prayers.rows[0].equipped,['A']);assert.deepEqual(prayers.rows[2].equipped,['A']);
const refinery=R.refinery({Refinery:[[0],["Refinery1"],[99],[0,3,0,1,0]]});assert.equal(refinery.slots[0].rank,3);assert.equal(refinery.slots[0].stored,99);
const obols=R.obols({ObolEqO1:['ObolA'],ObolEqMAPz1:{0:{LUK:3,UQ1val:2}}});assert.equal(obols.boards[0].totals.LUK,3);
const hole=R.hole({Holes:[[2],[5],[10],[],[],[],[],[1]]});assert.equal(hole.villagers[0].level,2);assert(hole.buildings[0].owned);console.log('Remaining world system tests passed.');

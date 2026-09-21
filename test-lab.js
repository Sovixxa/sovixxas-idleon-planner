const assert=require('node:assert/strict'),{decode}=require('./lab');
const vm=require('node:vm'),fs=require('node:fs'),ctx={window:{}};vm.runInNewContext(fs.readFileSync('lab-data.js','utf8'),ctx);
const lab=[];lab[1]=[0,0,1,-1,-1,-1,-1];lab[14]=[1,0];lab[15]=[3,1];
const levels=Array(13).fill(0);levels[12]=75;
const result=decode({Lab:JSON.stringify(lab),Lv0_0:levels},{charNames:['Test']},ctx.window.LAB_CATALOG);
assert.equal(result.totalLevel,75);assert.equal(result.chips[0].used,2);assert.equal(result.chips[0].available,1);assert.equal(result.jewels[0].owned,true);assert.equal(result.jewels[1].owned,false);assert.equal(result.jewels[2].owned,null);assert.equal(result.jewels[0].name,'Amethyst Rhinestone');assert.equal(decode({}, {},ctx.window.LAB_CATALOG).totalLevel,null);
console.log('Lab: character levels, duplicate chips, spare inventory and jewel ownership OK');

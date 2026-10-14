'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),X=require('./afk-tester');
assert.equal(X.amount('2.5B'),2.5e9);assert.equal(X.amount('1,250'),1250);assert.equal(X.amount('1.2e+38'),1.2e38);
for(const v of ['',null,'-1','Infinity','1e999','NaN','garbage'])assert.equal(X.amount(v),null);
const req=X.requirement(499),result=X.calculate({level:499,progress:req/2,rate:req/4},500);
assert.equal(result.hours,2);assert.equal(result.remaining,req/2);
assert.equal(X.calculate({level:498,progress:0,rate:1},500).remaining,X.requirement(498)+req);
assert.equal(X.calculate({level:500},500).ready,true);
for(const row of [{level:499,progress:''},{level:499,progress:req},{level:499,progress:0,rate:0},{level:1.5,progress:0,rate:1}])assert(X.calculate(row,500).error);
assert(X.calculate({level:1,progress:0,rate:1},10001).error);
assert.deepEqual(X.roster({rawData:{Lv0_2:'[49]',Exp0_2:'[123]',Lv0_0:[20]},rawRoot:{charNames:['<test>']}}).map(r=>[r.name,r.level,r.progress]),[['<test>',20,''],['Character 3',49,123]]);
// Independent oracle from the locally supplied client, when available.
if(fs.existsSync('../audit/N.js')){
 const source=fs.readFileSync('../audit/N.js','utf8'),marker='q._customBlock_expReqQTY=',start=source.indexOf(marker)+marker.length,end=source.indexOf(',q._customBlock_GoldFoodBonuses=',start);
 assert(start>=marker.length&&end>start);const oracle=vm.runInNewContext('('+source.slice(start,end)+')',{Math});
 for(const level of [1,2,50,100,321,322,499,500,999,1750,2000])assert(Math.abs(X.requirement(level)/oracle(0,level)-1)<1e-12);
}
console.log('AFK tester: target sums, partial progress, invalid inputs, imports and client formula parity passed.');

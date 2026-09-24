'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('daily-lore.js','utf8'),c);const M=c.DailyLore;
assert.equal(M.gain(99),null);assert.equal(M.gain(100).min,1);assert.equal(M.gain(100).max,1);assert.equal(M.gain(100.5),null);assert.equal(M.gain(Infinity),null);
const rows=[100,2500,10000,200000].map(threshold=>({lore:{threshold}}));
assert.deepEqual(Array.from(M.chances(rows,2499)),[1,0,0,0]);
assert.deepEqual(Array.from(M.chances(rows,2500)),[.5,.5,0,0]);
assert.deepEqual(Array.from(M.chances(rows,2000000)),[.2734375,.2734375,.328125,.125]);
for(const pages of [100,2499,2500,10000,2000000])for(const multi of [1,1.116185235,1.5]){
 const g=M.gain(pages,multi);assert(Math.abs(g.distribution.reduce((s,x)=>s+x.chance,0)-1)<1e-10);
 const base=1+Math.log(pages/100)/Math.log(2)+3*Math.log(pages/100)/2.30259;
 let sum=0;for(let i=0;i<10000;i++)sum+=Math.floor((base+(i+.5)/10000)*multi);
 assert(Math.abs(sum/10000-g.expected)<.001);
}
assert(M.gain(2000000).expected>M.gain(2499).expected);
for(const multi of [1,1.116185235,1.5])for(let level=1;level<=50;level++){
 const p=M.levelBreakpoint(level,multi);if(p===null)continue;
 assert(M.gain(p,multi).min>=level);if(p>100)assert(M.gain(p-1,multi).min<level);
}
assert.equal(M.effect({func:'decay',base:30,scale:500,multi:1,template:'+{% EXP'},500),'+15% EXP');
console.log('Daily Lore: exact eligibility boundaries, priority probabilities, random level distribution, and bonus effects passed.');
